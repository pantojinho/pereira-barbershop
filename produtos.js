/**
 * produtos.js — Lojinha de Produtos Pereira's Barber Shop
 * 
 * Fluxo: Produtos (selecionar + quantidade) → Carrinho (revisar) → Dados (nome + WhatsApp) → Confirmação
 * 
 * Dados salvos no Supabase (tabela product_orders) com status "reserved".
 * Nenhum pagamento online — retirada na loja, pagamento na hora.
 * 
 * Objeto global ShopApp exposto para onclick nos botoes +/- do HTML.
 */
(function () {
    'use strict';

    var sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    var currentStep = 1;
    var totalSteps = 3;

    var PRODUCTS_DB = []; // todos os produtos ativos carregados do Supabase
    var cart = {};        // formato: { productId: quantidade }

    // ========== HELPERS ==========

    /** Atalhos DOM */
    function $(id) { return document.getElementById(id); }
    function $$(sel) { return document.querySelectorAll(sel); }

    /** Escapa HTML para prevenir XSS */
    function escapeHTML(value) {
        return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
            return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch];
        });
    }

    /** Formata valor numérico como moeda brasileira R$ XX,XX */
    function formatPrice(value) {
        return 'R$ ' + Number(value).toFixed(2).replace('.', ',');
    }

    // ========== CART HELPERS ==========

    /** Calcula valor total do carrinho */
    function getCartTotal() {
        var total = 0;
        for (var id in cart) {
            var p = PRODUCTS_DB.find(function (pr) { return pr.id === id; });
            if (p) total += Number(p.price) * cart[id];
        }
        return total;
    }

    /** Retorna quantidade total de itens no carrinho */
    function getCartCount() {
        var count = 0;
        for (var id in cart) { count += cart[id]; }
        return count;
    }

    // Atualiza o badge flutuante "X itens" na barra de navegacao
    /** Atualiza badge de quantidade do carrinho no header */
    function updateCartBadge() {
        var count = getCartCount();
        var badge = $('cart-badge');
        if (count > 0) {
            badge.style.display = 'flex';
            $('cart-count').textContent = count;
        } else {
            badge.style.display = 'none';
        }
    }

    // Atualiza visual dos cards de produto (borda verde quando no carrinho)
    /** Atualiza estado visual dos botões de adicionar/remover nos cards de produto */
    function updateProductCards() {
        $$('.product-card').forEach(function (card) {
            var id = card.getAttribute('data-id');
            if (cart[id] && cart[id] > 0) {
                card.classList.add('in-cart');
            } else {
                card.classList.remove('in-cart');
            }
            var qtySpan = card.querySelector('.qty-value');
            if (qtySpan) qtySpan.textContent = cart[id] || 0;
            var removeBtn = card.querySelector('.btn-remove');
            if (removeBtn) removeBtn.style.display = (cart[id] && cart[id] > 0) ? 'flex' : 'none';
        });
    }

    // ========== ACOES DO CARRINHO (chamadas via ShopApp no onclick) ==========

    /** Adiciona um produto ao carrinho */
    function addToCart(id) {
        if (!cart[id]) cart[id] = 0;
        var p = PRODUCTS_DB.find(function (pr) { return pr.id === id; });
        if (p && cart[id] >= (p.stock || 0)) {
            toast('Sem estoque disponível');
            return;
        }
        cart[id]++;
        updateProductCards();
        updateCartBadge();
        updateNavButtons();
    }

    /** Remove um produto do carrinho */
    function removeFromCart(id) {
        if (cart[id] && cart[id] > 0) {
            cart[id]--;
            if (cart[id] === 0) delete cart[id];
        }
        updateProductCards();
        updateCartBadge();
        updateNavButtons();
    }

    // ========== INIT: carrega produtos do Supabase ==========

    /** Inicializa a lojinha: carrega produtos e configura navegação */
    async function init() {
        await loadProducts();
        setupNav();
        updateNavButtons();
    }

    // Carrega produtos ativos do Supabase e renderiza os cards com botoes +/-
    /** Carrega produtos ativos do Supabase e renderiza os cards */
    async function loadProducts() {
        try {
            var result = await sb.from('products').select('*').eq('active', true).order('sort_order').order('name');
            PRODUCTS_DB = result.data || [];

            if (!PRODUCTS_DB.length) {
                $('products-list').innerHTML = '<div class="empty-products"><i class="fas fa-box-open"></i><p>Nenhum produto disponível no momento.</p><a href="index.html" class="btn-back-home"><i class="fas fa-arrow-left"></i> Voltar ao Início</a></div>';
                return;
            }

            var html = '';
            PRODUCTS_DB.forEach(function (p) {
                var photoHtml = p.photo_url
                    ? '<img src="' + escapeHTML(p.photo_url) + '" alt="' + escapeHTML(p.name) + '" loading="lazy">'
                    : '<div class="product-photo-placeholder"><i class="fas fa-box"></i></div>';
                var descHtml = p.description ? '<p class="product-desc">' + escapeHTML(p.description) + '</p>' : '';
                var outOfStock = p.stock === 0;
                html += '<div class="product-card' + (outOfStock ? ' out-of-stock' : '') + '" data-id="' + p.id + '">' +
                    (outOfStock ? '<div class="out-of-stock-badge">Esgotado</div>' : '') +
                    '<div class="product-photo">' + photoHtml + '</div>' +
                    '<div class="product-info">' +
                        '<div class="product-name">' + escapeHTML(p.name) + '</div>' +
                        descHtml +
                        '<div class="product-price">' + formatPrice(p.price) + '</div>' +
                    '</div>' +
                    '<div class="product-qty">' +
                        '<button class="btn-remove" onclick="ShopApp.removeProduct(\'' + p.id + '\')" style="display:none"><i class="fas fa-minus"></i></button>' +
                        '<span class="qty-value">0</span>' +
                        (outOfStock ? '' : '<button onclick="ShopApp.addProduct(\'' + p.id + '\')"><i class="fas fa-plus"></i></button>') +
                    '</div>' +
                '</div>';
            });
            $('products-list').innerHTML = html;
        } catch (err) {
            $('products-list').innerHTML = '<div class="empty-products"><i class="fas fa-exclamation-triangle"></i><p>Erro ao carregar produtos.</p></div>';
        }
    }

    // ========== PASSO 2: RENDER DO CARRINHO ==========

    /** Renderiza o conteúdo do carrinho no step 2 */
    function renderCart() {
        var container = $('cart-items');
        var keys = Object.keys(cart);
        if (!keys.length) {
            container.innerHTML = '<div class="empty-products"><i class="fas fa-shopping-bag"></i><p>Seu carrinho está vazio.</p></div>';
            $('cart-summary').style.display = 'none';
            return;
        }

        $('cart-summary').style.display = 'block';

        container.innerHTML = keys.map(function (id) {
            var p = PRODUCTS_DB.find(function (pr) { return pr.id === id; });
            if (!p) return '';
            var photoHtml = p.photo_url
                ? '<img src="' + escapeHTML(p.photo_url) + '" alt="' + escapeHTML(p.name) + '">'
                : '<div class="cart-item-photo-placeholder"><i class="fas fa-box"></i></div>';
            return '<div class="cart-item">' +
                '<div class="cart-item-photo">' + photoHtml + '</div>' +
                '<div class="cart-item-info">' +
                    '<div class="cart-item-name">' + escapeHTML(p.name) + '</div>' +
                    '<div class="cart-item-price">' + formatPrice(p.price) + ' x ' + cart[id] + ' = ' + formatPrice(Number(p.price) * cart[id]) + '</div>' +
                '</div>' +
                '<div class="cart-item-qty">' +
                    '<button onclick="ShopApp.cartMinus(\'' + id + '\')"><i class="fas fa-minus"></i></button>' +
                    '<span>' + cart[id] + '</span>' +
                    '<button onclick="ShopApp.cartPlus(\'' + id + '\')"><i class="fas fa-plus"></i></button>' +
                '</div>' +
            '</div>';
        }).join('');

        $('cart-total').textContent = formatPrice(getCartTotal());
    }

    /** Diminui quantidade de um item no carrinho (step 2 inline) */
    function cartMinus(id) {
        if (cart[id] && cart[id] > 1) {
            cart[id]--;
        } else {
            delete cart[id];
        }
        renderCart();
        updateCartBadge();
        updateNavButtons();
    }

    /** Aumenta quantidade de um item no carrinho (step 2 inline) */
    function cartPlus(id) {
        if (!cart[id]) cart[id] = 0;
        var p = PRODUCTS_DB.find(function (pr) { return pr.id === id; });
        if (p && cart[id] >= (p.stock || 0)) {
            toast('Sem estoque disponível');
            return;
        }
        cart[id]++;
        renderCart();
        updateCartBadge();
        updateNavButtons();
    }

    // ========== PASSO 3: RENDER DO RESUMO DO PEDIDO ==========

    /** Renderiza o resumo do pedido no step 3 (dados do cliente) */
    function renderOrderSummary() {
        var container = $('order-summary-items');
        var keys = Object.keys(cart);
        var html = '';
        keys.forEach(function (id) {
            var p = PRODUCTS_DB.find(function (pr) { return pr.id === id; });
            if (!p) return;
            html += '<div class="order-item">' +
                '<span class="order-item-name">' + escapeHTML(p.name) + ' <span class="order-item-qty">x' + cart[id] + '</span></span>' +
                '<span class="order-item-price">' + formatPrice(Number(p.price) * cart[id]) + '</span>' +
            '</div>';
        });
        container.innerHTML = html;
        $('order-total-value').textContent = formatPrice(getCartTotal());
    }

    // ========== NAVEGACAO ENTRE PASSOS ==========

    function setupNav() {
        $('btn-back').addEventListener('click', function () {
            if (currentStep > 1) {
                currentStep--;
                showStep(currentStep);
            }
        });

        $('btn-next').addEventListener('click', function () {
            if (!validateStep(currentStep)) return;
            if (currentStep < totalSteps) {
                currentStep++;
                showStep(currentStep);
            } else {
                submitOrder();
            }
        });
    }

    function showStep(step) {
        $$('.step-content').forEach(function (s) { s.classList.remove('active'); });
        $('step-' + step).classList.add('active');

        $$('.stepper .step').forEach(function (s, i) {
            s.classList.remove('active', 'completed');
            if (i + 1 === step) s.classList.add('active');
            if (i + 1 < step) s.classList.add('completed');
        });

        $$('.step-line').forEach(function (line, i) {
            line.classList.toggle('active', i < step - 1);
        });

        if (step === 2) renderCart();
        if (step === 3) renderOrderSummary();

        $('products-nav').style.display = step === totalSteps + 1 ? 'none' : 'flex';
        updateNavButtons();

        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Valida cada passo antes de avancar (produto selecionado, dados preenchidos)
    function validateStep(step) {
        if (step === 1) {
            if (getCartCount() === 0) {
                shakeElement($('products-list'));
                return false;
            }
            return true;
        }
        if (step === 2) {
            if (getCartCount() === 0) return false;
            return true;
        }
        if (step === 3) {
            var name = $('client-name').value.trim();
            var phone = $('client-phone').value.trim();
            if (!name) { shakeElement($('client-name')); return false; }
            if (!phone || phone.replace(/\D/g, '').length < 10) { shakeElement($('client-phone')); return false; }
            return true;
        }
        return true;
    }

    function shakeElement(el) {
        el.style.animation = 'none';
        el.offsetHeight;
        el.style.animation = 'shake 0.4s ease';
        setTimeout(function () { el.style.animation = ''; }, 500);
    }

    function updateNavButtons() {
        $('btn-back').style.visibility = currentStep === 1 ? 'hidden' : 'visible';

        if (currentStep === totalSteps) {
            $('btn-next').innerHTML = '<i class="fas fa-check"></i> Reservar';
        } else {
            $('btn-next').innerHTML = 'Próximo <i class="fas fa-arrow-right"></i>';
        }

        var canNext = false;
        if (currentStep === 1) canNext = getCartCount() > 0;
        else if (currentStep === 2) canNext = getCartCount() > 0;
        else if (currentStep === 3) canNext = true;

        $('btn-next').disabled = !canNext;
    }

    // ========== SUBMISSAO: salva pedido no Supabase (product_orders) ==========

    async function submitOrder() {
        if (!validateStep(3)) return;

        var nextBtn = $('btn-next');
        var originalHTML = nextBtn.innerHTML;
        nextBtn.disabled = true;
        nextBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';

        var clientName = $('client-name').value.trim();
        var clientPhone = $('client-phone').value.trim();

        var productIds = [];
        var productNames = [];
        var productPrices = [];
        var quantities = [];
        var totalPrice = 0;

        for (var id in cart) {
            var p = PRODUCTS_DB.find(function (pr) { return pr.id === id; });
            if (!p) continue;
            productIds.push(id);
            productNames.push(p.name);
            productPrices.push(Number(p.price));
            quantities.push(cart[id]);
            totalPrice += Number(p.price) * cart[id];
        }

        try {
            var result = await sb.from('product_orders').insert({
                product_ids: productIds,
                product_names: productNames,
                product_prices: productPrices,
                quantities: quantities,
                client_name: clientName,
                client_phone: clientPhone,
                total_price: totalPrice,
                status: 'reserved'
            });

            if (result.error) {
                alert('Erro ao reservar produtos: ' + result.error.message);
                nextBtn.disabled = false;
                nextBtn.innerHTML = originalHTML;
                return;
            }
        } catch (err) {
            alert('Erro de conexão. Tente novamente.');
            nextBtn.disabled = false;
            nextBtn.innerHTML = originalHTML;
            return;
        }

        var details = $('confirm-details');
        var html = '';
        for (var i = 0; i < productNames.length; i++) {
            html += '<div class="order-item">' +
                '<span class="order-item-name">' + escapeHTML(productNames[i]) + ' <span class="order-item-qty">x' + quantities[i] + '</span></span>' +
                '<span class="order-item-price">' + formatPrice(productPrices[i] * quantities[i]) + '</span>' +
            '</div>';
        }
        html += '<div class="order-total"><span>Total:</span><span>' + formatPrice(totalPrice) + '</span></div>';
        details.innerHTML = html;

        var msg = 'Olá! Acabei de reservar produtos pelo site:\n\n' +
            productNames.map(function (name, i) {
                return '• ' + name + ' x' + quantities[i] + ' = ' + formatPrice(productPrices[i] * quantities[i]);
            }).join('\n') +
            '\n\n*Total: ' + formatPrice(totalPrice) + '*' +
            '\n\nNome: ' + clientName +
            '\nTel: ' + clientPhone +
            '\n\nVou retirar na loja!';

        $('btn-whatsapp-confirm').href = 'https://wa.me/5515981311623?text=' + encodeURIComponent(msg);

        $$('.step-content').forEach(function (s) { s.classList.remove('active'); });
        $('step-confirm').classList.add('active');
        $('products-nav').style.display = 'none';

        $$('.stepper .step').forEach(function (s) { s.classList.add('completed'); });
        $$('.step-line').forEach(function (l) { l.classList.add('active'); });
    }

    // ========== MASCARA DE TELEFONE (XX) XXXXX-XXXX ==========

    $('client-phone').addEventListener('input', function (e) {
        var v = e.target.value.replace(/\D/g, '');
        if (v.length > 11) v = v.slice(0, 11);
        if (v.length > 6) {
            e.target.value = '(' + v.slice(0, 2) + ') ' + v.slice(2, 7) + '-' + v.slice(7);
        } else if (v.length > 2) {
            e.target.value = '(' + v.slice(0, 2) + ') ' + v.slice(2);
        } else if (v.length > 0) {
            e.target.value = '(' + v;
        }
    });

    var style = document.createElement('style');
    style.textContent = '@keyframes shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-8px)} 75%{transform:translateX(8px)} }';
    document.head.appendChild(style);

    // ========== TOAST ==========

    function toast(msg) {
        var el = document.createElement('div');
        el.textContent = msg;
        el.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#333;color:#fff;padding:10px 20px;border-radius:8px;font-size:0.9rem;z-index:9999;animation:shake 0.4s ease;';
        document.body.appendChild(el);
        setTimeout(function () { el.remove(); }, 2500);
    }

    // ========== MODAL DE DETALHE DO PRODUTO ==========

    var currentModalProductId = null;

    /** Abre o modal com detalhes completos do produto */
    function openProductDetail(id) {
        var p = PRODUCTS_DB.find(function (pr) { return pr.id === id; });
        if (!p) return;

        currentModalProductId = id;

        // Foto
        var photoContainer = $('product-modal-photo');
        if (p.photo_url) {
            photoContainer.innerHTML = '<img src="' + escapeHTML(p.photo_url) + '" alt="' + escapeHTML(p.name) + '">';
        } else {
            photoContainer.innerHTML = '<div class="product-photo-placeholder"><i class="fas fa-box"></i></div>';
        }

        // Info
        $('product-modal-name').textContent = p.name;
        $('product-modal-desc').textContent = p.description || 'Sem descrição disponível.';
        $('product-modal-price').textContent = formatPrice(p.price);

        // Estoque
        var stockEl = $('product-modal-stock');
        if (p.stock !== undefined && p.stock !== null) {
            if (p.stock === 0) {
                stockEl.innerHTML = '<span style="color:#C62828;font-weight:600">Esgotado</span>';
            } else if (p.stock <= 3) {
                stockEl.innerHTML = '<span style="color:#E65100;font-weight:600">Restam ' + p.stock + ' unidades</span>';
            } else {
                stockEl.textContent = '';
            }
        } else {
            stockEl.textContent = '';
        }

        // Quantidade no carrinho
        $('modal-qty-value').textContent = cart[id] || 0;
        updateModalButtons(id);

        // Mostra modal
        var overlay = $('product-modal-overlay');
        overlay.style.display = 'flex';
        // Force reflow then add class for animation
        overlay.offsetHeight;
        overlay.classList.add('open');
        document.body.style.overflow = 'hidden';
    }

    /** Fecha o modal de detalhe */
    function closeProductDetail() {
        var overlay = $('product-modal-overlay');
        overlay.classList.remove('open');
        setTimeout(function () {
            overlay.style.display = 'none';
            document.body.style.overflow = '';
        }, 250);
        currentModalProductId = null;
    }

    /** Atualiza estado dos botoes +/- no modal */
    function updateModalButtons(id) {
        var p = PRODUCTS_DB.find(function (pr) { return pr.id === id; });
        var qty = cart[id] || 0;
        var removeBtn = $('modal-btn-remove');
        var addBtn = $('modal-btn-add');

        if (qty === 0) {
            removeBtn.classList.add('disabled');
        } else {
            removeBtn.classList.remove('disabled');
        }

        if (p && p.stock !== undefined && qty >= p.stock) {
            addBtn.classList.add('disabled');
        } else {
            addBtn.classList.remove('disabled');
        }
    }

    /** Adiciona via modal */
    function modalAdd() {
        if (!currentModalProductId) return;
        var id = currentModalProductId;
        var p = PRODUCTS_DB.find(function (pr) { return pr.id === id; });
        if (p && cart[id] && cart[id] >= (p.stock || Infinity)) {
            toast('Sem estoque disponível');
            return;
        }
        if (!cart[id]) cart[id] = 0;
        cart[id]++;
        $('modal-qty-value').textContent = cart[id];
        updateModalButtons(id);
        updateProductCards();
        updateCartBadge();
        updateNavButtons();
    }

    /** Remove via modal */
    function modalRemove() {
        if (!currentModalProductId) return;
        var id = currentModalProductId;
        if (cart[id] && cart[id] > 0) {
            cart[id]--;
            if (cart[id] === 0) delete cart[id];
        }
        $('modal-qty-value').textContent = cart[id] || 0;
        updateModalButtons(id);
        updateProductCards();
        updateCartBadge();
        updateNavButtons();
    }

    // Event listeners do modal
    $('product-modal-close').addEventListener('click', function (e) {
        e.stopPropagation();
        closeProductDetail();
    });

    $('product-modal-overlay').addEventListener('click', function (e) {
        if (e.target === this) closeProductDetail();
    });

    $('modal-btn-add').addEventListener('click', function (e) {
        e.stopPropagation();
        modalAdd();
    });

    $('modal-btn-remove').addEventListener('click', function (e) {
        e.stopPropagation();
        modalRemove();
    });

    // Fechar modal com ESC
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && currentModalProductId) closeProductDetail();
    });

    // Delegacao de click nos cards — abre modal ao tocar no card, NAO nos botoes +/-
    $('products-list').addEventListener('click', function (e) {
        // Ignora clicks nos botoes de quantidade (eles ja tem onclick proprio)
        if (e.target.closest('.product-qty')) return;

        var card = e.target.closest('.product-card');
        if (!card) return;

        var id = card.getAttribute('data-id');
        if (id) openProductDetail(id);
    });

    // ========== API PUBLICA (ShopApp) — chamada via onclick no HTML ==========

    window.ShopApp = {
        addProduct: addToCart,
        removeProduct: removeFromCart,
        cartPlus: cartPlus,
        cartMinus: cartMinus
    };

    init();
})();
