/* ============================================
   HARIA - Landing Page JavaScript
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
    // Initialize all modules
    initScrollAnimations();
    initNavbar();
    initFAQ();
    initMobileMenu();
    initSmoothScroll();
    initTestimonialsSlider();
    initChatDemo();
});

/* ============================================
   Scroll Animations (Fade In)
   ============================================ */
function initScrollAnimations() {
    const observerOptions = {
        root: null,
        rootMargin: '0px 0px -100px 0px',
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                // Optional: unobserve after animation
                // observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Observe all fade-in elements
    document.querySelectorAll('.fade-in').forEach(el => {
        observer.observe(el);
    });
}

/* ============================================
   Navbar Scroll Effect
   ============================================ */
function initNavbar() {
    const navbar = document.querySelector('.navbar');
    let lastScroll = 0;
    
    window.addEventListener('scroll', () => {
        const currentScroll = window.pageYOffset;
        
        // Add shadow on scroll
        if (currentScroll > 50) {
            navbar.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.08)';
        } else {
            navbar.style.boxShadow = 'none';
        }
        
        // Hide/show navbar on scroll
        if (currentScroll > lastScroll && currentScroll > 500) {
            navbar.style.transform = 'translateY(-100%)';
        } else {
            navbar.style.transform = 'translateY(0)';
        }
        
        lastScroll = currentScroll;
    });
}

/* ============================================
   FAQ Accordion
   ============================================ */
function initFAQ() {
    const faqItems = document.querySelectorAll('.faq-item');
    
    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        
        question.addEventListener('click', () => {
            // Close other items
            faqItems.forEach(otherItem => {
                if (otherItem !== item && otherItem.classList.contains('active')) {
                    otherItem.classList.remove('active');
                }
            });
            
            // Toggle current item
            item.classList.toggle('active');
        });
    });
}

/* ============================================
   Mobile Menu
   ============================================ */
function initMobileMenu() {
    const menuBtn = document.querySelector('.mobile-menu-btn');
    const navLinks = document.querySelector('.nav-links');
    let isOpen = false;
    
    if (!menuBtn) return;
    
    // Create mobile menu overlay
    const mobileMenu = document.createElement('div');
    mobileMenu.className = 'mobile-menu';
    mobileMenu.innerHTML = `
        <div class="mobile-menu-content">
            <a href="#demo" class="mobile-link">Démo</a>
            <a href="#avantages" class="mobile-link">Avantages</a>
            <a href="#cas-clients" class="mobile-link">Cas clients</a>
            <a href="#tarifs" class="mobile-link">Tarifs</a>
            <a href="#faq" class="mobile-link">FAQ</a>
            <a href="#contact" class="btn btn-primary">Réserver une démo</a>
        </div>
    `;
    document.body.appendChild(mobileMenu);
    
    // Add mobile menu styles dynamically
    const style = document.createElement('style');
    style.textContent = `
        .mobile-menu {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(255, 255, 255, 0.98);
            backdrop-filter: blur(20px);
            z-index: 999;
            opacity: 0;
            visibility: hidden;
            transition: all 0.3s ease;
        }
        
        .mobile-menu.active {
            opacity: 1;
            visibility: visible;
        }
        
        .mobile-menu-content {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100%;
            gap: 24px;
            padding: 24px;
        }
        
        .mobile-link {
            font-size: 1.5rem;
            font-weight: 600;
            color: var(--gray-800);
            transition: color 0.2s ease;
        }
        
        .mobile-link:hover {
            color: var(--primary);
        }
        
        .mobile-menu-btn.active span:nth-child(1) {
            transform: rotate(45deg) translate(5px, 5px);
        }
        
        .mobile-menu-btn.active span:nth-child(2) {
            opacity: 0;
        }
        
        .mobile-menu-btn.active span:nth-child(3) {
            transform: rotate(-45deg) translate(7px, -6px);
        }
    `;
    document.head.appendChild(style);
    
    // Toggle menu
    menuBtn.addEventListener('click', () => {
        isOpen = !isOpen;
        menuBtn.classList.toggle('active');
        mobileMenu.classList.toggle('active');
        document.body.style.overflow = isOpen ? 'hidden' : '';
    });
    
    // Close menu on link click
    mobileMenu.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            isOpen = false;
            menuBtn.classList.remove('active');
            mobileMenu.classList.remove('active');
            document.body.style.overflow = '';
        });
    });
}

/* ============================================
   Smooth Scroll
   ============================================ */
function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            
            if (target) {
                const navbarHeight = document.querySelector('.navbar').offsetHeight;
                const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - navbarHeight - 20;
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
}

/* ============================================
   Testimonials Infinite Slider
   ============================================ */
function initTestimonialsSlider() {
    const track = document.querySelector('.testimonials-track');
    
    if (!track) return;
    
    // Clone items for infinite scroll
    const items = track.innerHTML;
    track.innerHTML = items + items;
    
    // Pause on hover
    track.addEventListener('mouseenter', () => {
        track.style.animationPlayState = 'paused';
    });
    
    track.addEventListener('mouseleave', () => {
        track.style.animationPlayState = 'running';
    });
}

/* ============================================
   Counter Animation (for stats)
   ============================================ */
function animateCounter(element, target, duration = 2000) {
    const start = 0;
    const startTime = performance.now();
    
    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function
        const easeOutQuart = 1 - Math.pow(1 - progress, 4);
        const current = Math.floor(easeOutQuart * target);
        
        element.textContent = current;
        
        if (progress < 1) {
            requestAnimationFrame(update);
        } else {
            element.textContent = target;
        }
    }
    
    requestAnimationFrame(update);
}

/* ============================================
   Chat Demo Animation
   ============================================ */
function initChatDemo() {
    const chatMessages = document.getElementById('chat-demo');
    
    if (!chatMessages) return;
    
    const conversation = [
        { type: 'user', text: 'Je cherche une solution pour augmenter les ventes sur mon site web.' },
        { type: 'bot', text: 'Génial, qu\'avez-vous déjà essayé jusqu\'à présent ?' },
        { type: 'user', text: 'J\'ai investi beaucoup d\'argent dans la refonte de mon site, mais sans réels résultats.' },
        { type: 'bot', text: 'Je comprends. Dans ce cas, un chatbot IA pourrait clairement être la solution à votre problème. Il vous permettrait de réaugmenter les ventes sur votre site web.' }
    ];
    
    let messageIndex = 0;
    
    function showTypingIndicator(type) {
        const typingDiv = document.createElement('div');
        typingDiv.className = `chat-message ${type} typing`;
        typingDiv.innerHTML = '<span class="typing-dots"><span></span><span></span><span></span></span>';
        chatMessages.appendChild(typingDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        return typingDiv;
    }
    
    function addMessage(type, text) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${type}`;
        messageDiv.innerHTML = `<p>${text}</p>`;
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    function playNextMessage() {
        if (messageIndex >= conversation.length) {
            // Recommencer après une pause
            setTimeout(() => {
                // Supprimer tous les messages sauf le premier
                const allMessages = chatMessages.querySelectorAll('.chat-message');
                allMessages.forEach((msg, index) => {
                    if (index > 0) msg.remove();
                });
                messageIndex = 0;
                setTimeout(playNextMessage, 2000);
            }, 5000);
            return;
        }
        
        const currentMessage = conversation[messageIndex];
        
        // Afficher l'indicateur de typing
        const typingIndicator = showTypingIndicator(currentMessage.type);
        
        // Après 3 secondes, remplacer le typing par le message
        setTimeout(() => {
            typingIndicator.remove();
            addMessage(currentMessage.type, currentMessage.text);
            messageIndex++;
            
            // Passer au message suivant après une courte pause
            setTimeout(playNextMessage, 1000);
        }, 3000);
    }
    
    // Démarrer l'animation après 2 secondes
    setTimeout(playNextMessage, 2000);
}

/* ============================================
   Form Validation (if contact form is added)
   ============================================ */
function initFormValidation(formSelector) {
    const form = document.querySelector(formSelector);
    
    if (!form) return;
    
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const email = form.querySelector('input[type="email"]');
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        
        if (!emailRegex.test(email.value)) {
            showError(email, 'Veuillez entrer une adresse email valide');
            return;
        }
        
        // Submit form
        submitForm(form);
    });
}

function showError(input, message) {
    const formGroup = input.parentElement;
    const error = formGroup.querySelector('.error-message') || document.createElement('span');
    error.className = 'error-message';
    error.textContent = message;
    error.style.cssText = 'color: #ef4444; font-size: 0.875rem; margin-top: 4px; display: block;';
    
    if (!formGroup.querySelector('.error-message')) {
        formGroup.appendChild(error);
    }
    
    input.style.borderColor = '#ef4444';
    
    setTimeout(() => {
        error.remove();
        input.style.borderColor = '';
    }, 3000);
}

function submitForm(form) {
    const btn = form.querySelector('button[type="submit"]');
    const originalText = btn.textContent;
    
    btn.textContent = 'Envoi en cours...';
    btn.disabled = true;
    
    // Simulate API call
    setTimeout(() => {
        btn.textContent = 'Envoyé !';
        btn.style.background = '#10b981';
        
        setTimeout(() => {
            btn.textContent = originalText;
            btn.style.background = '';
            btn.disabled = false;
            form.reset();
        }, 2000);
    }, 1500);
}

/* ============================================
   Utility: Debounce
   ============================================ */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/* ============================================
   Utility: Throttle
   ============================================ */
function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}
