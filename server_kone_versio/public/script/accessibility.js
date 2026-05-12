(function () {
    const focusableSelector = [
        'a[href]',
        'button:not([disabled])',
        'input:not([disabled])',
        'select:not([disabled])',
        'textarea:not([disabled])',
        '[tabindex]:not([tabindex="-1"])',
        '[role="button"]'
    ].join(',');

    function isActivationKey(event) {
        return event.key === 'Enter' || event.key === ' ';
    }

    function ensureStatusRegion() {
        let region = document.getElementById('a11y-status');
        if (region) return region;

        region = document.createElement('div');
        region.id = 'a11y-status';
        region.className = 'sr-only';
        region.setAttribute('role', 'status');
        region.setAttribute('aria-live', 'polite');
        region.setAttribute('aria-atomic', 'true');
        document.body.appendChild(region);
        return region;
    }

    function announce(message) {
        const region = ensureStatusRegion();
        region.textContent = '';
        window.setTimeout(() => {
            region.textContent = message;
        }, 50);
    }

    function setButtonLike(element, label) {
        if (!element) return;
        element.setAttribute('role', 'button');
        element.setAttribute('tabindex', '0');
        if (label && !element.getAttribute('aria-label')) {
            element.setAttribute('aria-label', label);
        }
    }

    function addSkipLink() {
        if (document.querySelector('.skip-link')) return;

        const main = document.querySelector('main, .content, .cart-container, .success-container, .cancel-container, .login-card');
        if (!main) return;

        if (!main.id) main.id = 'main-content';
        if (!main.hasAttribute('tabindex')) main.setAttribute('tabindex', '-1');

        const skipLink = document.createElement('a');
        skipLink.className = 'skip-link';
        skipLink.href = `#${main.id}`;
        skipLink.textContent = 'Siirry sisältöön';
        document.body.prepend(skipLink);
    }

    function enhanceLandmarks() {
        document.querySelectorAll('header.main-header').forEach((header) => {
            header.setAttribute('role', 'banner');
        });

        document.querySelectorAll('nav.main-nav').forEach((nav) => {
            if (!nav.getAttribute('aria-label')) nav.setAttribute('aria-label', 'Paavalikko');
        });

        document.querySelectorAll('.side-nav').forEach((nav) => {
            if (!nav.getAttribute('aria-label')) nav.setAttribute('aria-label', 'Kategoriat');
        });

        document.querySelectorAll('.search-box').forEach((search) => {
            search.setAttribute('role', 'search');
            if (!search.getAttribute('aria-label')) search.setAttribute('aria-label', 'Tuotehaku');
        });
    }

    function enhanceHeaderControls() {
        const menuButton = document.getElementById('mobile-menu-btn');
        const mainNav = document.getElementById('main-navigation');
        if (menuButton && mainNav) {
            if (!mainNav.id) mainNav.id = 'main-navigation';
            menuButton.setAttribute('type', 'button');
            menuButton.setAttribute('aria-controls', mainNav.id);
            if (!menuButton.getAttribute('aria-label')) {
                menuButton.setAttribute('aria-label', 'Avaa navigaatio');
            }
        }

        const categoryButton = document.getElementById('category-toggle-btn');
        const sidebar = document.querySelector('.sidebar');
        if (categoryButton && sidebar) {
            if (!sidebar.id) sidebar.id = 'category-navigation';
            categoryButton.setAttribute('aria-controls', sidebar.id);
        }

        document.querySelectorAll('.cart-wrapper').forEach((cart) => {
            setButtonLike(cart, 'Avaa ostoskori');
        });

        document.querySelectorAll('.search-box button').forEach((button) => {
            button.setAttribute('type', 'button');
            if (!button.getAttribute('aria-label')) {
                button.setAttribute('aria-label', 'Hae');
            }
        });

        document.querySelectorAll('.fa, .fas, .far, .fab').forEach((icon) => {
            if (!icon.closest('button[aria-label], a[aria-label]')) {
                icon.setAttribute('aria-hidden', 'true');
            }
        });
    }

    function enhanceLanguageSelector() {
        const selected = document.getElementById('selected-lang');
        const optionsContainer = document.getElementById('lang-options');
        if (!selected || !optionsContainer) return;

        selected.setAttribute('role', 'combobox');
        selected.setAttribute('tabindex', '0');
        selected.setAttribute('aria-label', 'Valitse kieli');
        selected.setAttribute('aria-haspopup', 'listbox');
        selected.setAttribute('aria-controls', 'lang-options');
        selected.setAttribute('aria-expanded', String(!optionsContainer.classList.contains('select-hide')));
        optionsContainer.setAttribute('role', 'listbox');
        optionsContainer.setAttribute('aria-label', 'Kielivaihtoehdot');

        optionsContainer.querySelectorAll('[data-value]').forEach((option, index) => {
            if (!option.id) option.id = `language-option-${index}`;
            option.setAttribute('role', 'option');
            option.setAttribute('tabindex', '-1');
        });

        const syncExpanded = () => {
            const isOpen = !optionsContainer.classList.contains('select-hide');
            selected.setAttribute('aria-expanded', String(isOpen));
            optionsContainer.querySelectorAll('[role="option"]').forEach((option) => {
                option.setAttribute('tabindex', isOpen ? '0' : '-1');
            });
        };

        selected.addEventListener('keydown', (event) => {
            if (isActivationKey(event) || event.key === 'ArrowDown') {
                event.preventDefault();
                event.stopPropagation();
                selected.click();
                syncExpanded();
            }
            if (event.key === 'Escape') {
                event.stopPropagation();
                optionsContainer.classList.add('select-hide');
                syncExpanded();
            }
        });

        optionsContainer.addEventListener('keydown', (event) => {
            const options = Array.from(optionsContainer.querySelectorAll('[role="option"]'));
            const currentIndex = options.indexOf(document.activeElement);

            if (isActivationKey(event)) {
                event.preventDefault();
                event.stopPropagation();
                document.activeElement.click();
                const label = document.activeElement.textContent.trim();
                if (label) announce(`Kieli vaihdettu: ${label}`);
                selected.focus();
                syncExpanded();
            }

            if (event.key === 'Escape') {
                event.stopPropagation();
                optionsContainer.classList.add('select-hide');
                selected.focus();
                syncExpanded();
            }

            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                event.preventDefault();
                event.stopPropagation();
                const direction = event.key === 'ArrowDown' ? 1 : -1;
                const next = options[(currentIndex + direction + options.length) % options.length];
                next?.focus();
            }
        });

        optionsContainer.addEventListener('focusout', () => {
            requestAnimationFrame(() => {
                if (optionsContainer.contains(document.activeElement) || document.activeElement === selected) return;
                optionsContainer.classList.add('select-hide');
                syncExpanded();
            });
        });

        document.addEventListener('click', syncExpanded);
        syncExpanded();
    }

    function enhanceForms() {
        document.querySelectorAll('.input-group label + input').forEach((input) => {
            const label = input.previousElementSibling;
            if (!label || label.tagName !== 'LABEL') return;
            if (!input.id) input.id = `field-${Math.random().toString(36).slice(2)}`;
            label.setAttribute('for', input.id);
        });

        document.querySelectorAll('input, textarea, select').forEach((input) => {
            if (input.getAttribute('aria-label') || input.id && document.querySelector(`label[for="${input.id}"]`)) return;
            const label = input.placeholder || input.name || input.id;
            if (label) input.setAttribute('aria-label', label);
        });
    }

    function enhanceLiveRegions() {
        document.querySelectorAll('.toast-notification').forEach((toast) => {
            toast.setAttribute('role', 'status');
            toast.setAttribute('aria-live', 'polite');
            toast.setAttribute('aria-atomic', 'true');
        });

        document.querySelectorAll('.quantity-error, .message.error').forEach((error) => {
            error.setAttribute('role', 'alert');
            error.setAttribute('aria-live', 'assertive');
        });

        document.querySelectorAll('#cart-count, .cart-count, #cart-total, #product-price').forEach((element) => {
            element.setAttribute('aria-live', 'polite');
            element.setAttribute('aria-atomic', 'true');
        });
    }

    function enhanceProductCards(root = document) {
        const cards = [];
        if (root instanceof HTMLElement && root.matches('.product-card')) {
            cards.push(root);
        }
        root.querySelectorAll?.('.product-card').forEach((card) => cards.push(card));

        cards.forEach((card) => {
            if (!card.dataset.productId) return;
            card.setAttribute('role', 'link');
            card.setAttribute('tabindex', '0');
            const title = card.querySelector('h3')?.textContent?.trim();
            if (title) card.setAttribute('aria-label', `Avaa tuotteen ${title} tiedot`);
        });
    }

    function enhanceProductTabs() {
        document.querySelectorAll('.tab-buttons').forEach((tabList) => {
            tabList.setAttribute('role', 'tablist');
            tabList.querySelectorAll('.tab-btn').forEach((button) => {
                const targetId = button.dataset.target;
                const panel = targetId ? document.getElementById(targetId) : null;

                button.setAttribute('role', 'tab');
                button.setAttribute('tabindex', '0');
                button.setAttribute('aria-selected', String(button.classList.contains('active')));

                if (panel) {
                    if (!button.id) button.id = `${targetId}-tab-button`;
                    button.setAttribute('aria-controls', panel.id);
                    panel.setAttribute('role', 'tabpanel');
                    panel.setAttribute('aria-labelledby', button.id);
                }
            });
        });
    }

    function syncProductTabs() {
        document.querySelectorAll('.tab-btn').forEach((button) => {
            button.setAttribute('aria-selected', String(button.classList.contains('active')));
        });
    }

    function setupKeyboardActivation() {
        document.addEventListener('keydown', (event) => {
            const target = event.target;
            if (!(target instanceof HTMLElement)) return;

            const buttonLike = target.closest('[role="button"]');
            if (buttonLike && isActivationKey(event) && !target.closest('#lang-options')) {
                event.preventDefault();
                buttonLike.click();
                return;
            }

            const productCard = target.closest('.product-card[role="link"]');
            if (productCard && event.key === 'Enter' && !target.closest('button, a, input, select, textarea')) {
                event.preventDefault();
                productCard.click();
            }

            const tabButton = target.closest('.tab-btn[role="tab"]');
            if (tabButton && isActivationKey(event)) {
                event.preventDefault();
                tabButton.click();
                announce(`${tabButton.textContent.trim()} valittu`);
                requestAnimationFrame(syncProductTabs);
            }
        });

        document.addEventListener('click', (event) => {
            if (event.target instanceof HTMLElement && event.target.closest('.tab-btn')) {
                requestAnimationFrame(syncProductTabs);
            }
        });

        document.addEventListener('keydown', (event) => {
            if (event.key !== 'Escape') return;

            document.querySelector('.main-nav.show')?.classList.remove('show');
            document.querySelector('.menu-toggle.open')?.classList.remove('open');

            const sidebar = document.querySelector('.sidebar.open');
            const categoryButton = document.getElementById('category-toggle-btn');
            if (sidebar) {
                sidebar.classList.remove('open');
                categoryButton?.classList.remove('open');
                categoryButton?.setAttribute('aria-expanded', 'false');
                document.body.classList.remove('sidebar-open');
                categoryButton?.focus();
            }

            const modal = document.querySelector('.cart-modal:not(.hidden)');
            if (modal) {
                modal.classList.add('hidden');
            }
        });
    }

    function setPageInert(modal, inert) {
        Array.from(document.body.children).forEach((child) => {
            if (child === modal || child.classList.contains('skip-link') || child.id === 'a11y-status') return;

            if (inert) {
                child.setAttribute('aria-hidden', 'true');
                if ('inert' in child) child.inert = true;
            } else {
                child.removeAttribute('aria-hidden');
                if ('inert' in child) child.inert = false;
            }
        });
    }

    function setupModalFocus() {
        const modal = document.getElementById('cart-modal');
        if (!modal) return;

        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-label', 'Ostoskori');

        let lastFocusedElement = null;

        const observer = new MutationObserver(() => {
            const isOpen = !modal.classList.contains('hidden');

            if (isOpen) {
                lastFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : lastFocusedElement;
                setPageInert(modal, true);
                const firstFocusable = modal.querySelector(focusableSelector);
                firstFocusable?.focus();
                announce('Ostoskori avattu');
                return;
            }

            setPageInert(modal, false);
            if (lastFocusedElement && document.body.contains(lastFocusedElement)) {
                lastFocusedElement.focus();
            } else {
                document.getElementById('cart-btn')?.focus();
            }
            announce('Ostoskori suljettu');
        });

        observer.observe(modal, { attributes: true, attributeFilter: ['class'] });

        modal.addEventListener('keydown', (event) => {
            if (event.key !== 'Tab' || modal.classList.contains('hidden')) return;

            const focusable = Array.from(modal.querySelectorAll(focusableSelector))
                .filter((element) => element.offsetParent !== null);
            if (focusable.length === 0) return;

            const first = focusable[0];
            const last = focusable[focusable.length - 1];

            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        });
    }

    function observeDynamicContent() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (!(node instanceof HTMLElement)) return;
                    enhanceProductCards(node);
                    enhanceForms();
                    enhanceLiveRegions();
                });
            });
        });

        observer.observe(document.body, { childList: true, subtree: true });
    }

    document.addEventListener('DOMContentLoaded', () => {
        ensureStatusRegion();
        addSkipLink();
        enhanceLandmarks();
        enhanceHeaderControls();
        enhanceLanguageSelector();
        enhanceForms();
        enhanceLiveRegions();
        enhanceProductCards();
        enhanceProductTabs();
        setupKeyboardActivation();
        setupModalFocus();
        observeDynamicContent();
    });

    window.announceToScreenReader = announce;
})();
