(function($) {
    "use strict";
  
    const $documentOn = $(document);
    const $windowOn = $(window);
  
    $documentOn.ready( function() {
        
        

        /* =========================================================
        MOBILE MENU OPEN
        ========================================================= */
        $(".mobile-topbar .bars").on("click", function () {
            $(".mobile-menu-overlay, .mobile-menu-main").addClass("active");
            $("body").addClass("no-scroll");
            return false;
        });

        /* =========================================================
        MOBILE MENU CLOSE
        ========================================================= */
        $(".close-mobile-menu, .mobile-menu-overlay").on("click", function () {
            $(".mobile-menu-overlay, .mobile-menu-main").removeClass("active");
            $("body").removeClass("no-scroll");

            // reset all menus
            $('.sub-mobile-menu ul, .sub-child-menu ul').slideUp(200);

            // reset icons
            $(".sub-mobile-menu i, .sub-child-menu i")
                .removeClass("fa-chevron-up")
                .addClass("fa-chevron-down");
        });

        /* =========================================================
        MOBILE SUB MENU INITIAL STATE
        ========================================================= */
        $('.sub-mobile-menu > ul, .sub-child-menu > ul').hide();

        /* =========================================================
        LEVEL 1 MENU
        ========================================================= */
        $(document).on("click", ".sub-mobile-menu > a", function (e) {

            let $parent = $(this).parent();
            let $submenu = $parent.children("ul");

            if ($submenu.length === 0) return;

            e.preventDefault();
            e.stopPropagation();

            // close other level-1 menus
            $('.sub-mobile-menu')
                .not($parent)
                .children("ul")
                .slideUp(250);

            // also close level-2 menus
            $('.sub-child-menu > ul').slideUp(250);

            $submenu.slideToggle(250);

            // reset icons
            $(".sub-mobile-menu > a i, .sub-child-menu > a i")
                .removeClass("fa-chevron-up")
                .addClass("fa-chevron-down");

            $(this).find("i").toggleClass("fa-chevron-up fa-chevron-down");
        });

        /* =========================================================
        LEVEL 2 MENU
        ========================================================= */
        $(document).on("click", ".sub-child-menu > a", function (e) {

            let $parent = $(this).parent();
            let $submenu = $parent.children("ul");

            if ($submenu.length === 0) return;

            e.preventDefault();
            e.stopPropagation();

            // close sibling level-2 menus
            $parent.siblings(".sub-child-menu")
                .children("ul")
                .slideUp(250);

            $submenu.slideToggle(250);

            // reset sibling icons
            $parent.siblings(".sub-child-menu")
                .find("i")
                .removeClass("fa-chevron-up")
                .addClass("fa-chevron-down");

            $(this).find("i").toggleClass("fa-chevron-up fa-chevron-down");
        });

        /* =========================================================
        OFFCANVAS MENU
        ========================================================= */
        $(".offcanvas-btn").on('click', function () {
            $(".offcanvas-menu, .offcanvas-overlay").addClass("active");
            $("body").addClass("no-scroll"); // ✅ added
        });

        $(".offcanvas-overlay, .offcasvas-close").on('click', function () {
            $(".offcanvas-menu, .offcanvas-overlay").removeClass("active");
            $("body").removeClass("no-scroll"); // ✅ added
        });

        /* =========================================================
        STICKY HEADER (FINAL FIX)
        ========================================================= */
        $windowOn.on('scroll', function () {

            var scroll = $windowOn.scrollTop();

            // ✅ Mobile OR Offcanvas open → sticky completely disabled
            if (
                $(".mobile-menu-overlay").hasClass("active") ||
                $(".offcanvas-overlay").hasClass("active")
            ) {
                return;
            }

            if (scroll < 120) {
                $("#sticky-header").removeClass("sticky-menu");
                $("#header-fixed-height").removeClass("active-height");
            } else {
                $("#sticky-header").addClass("sticky-menu");
                $("#header-fixed-height").addClass("active-height");
            }
        });

    /*----------------------------------------------
        # Background Color
        ----------------------------------------------*/
        $("[data-bg-color]").each(function () {
            $(this).css("background-color", $(this).attr("data-bg-color"));
        });

        /*----------------------------------------------
        # Background Image
        ----------------------------------------------*/
        $("[data-background]").each(function () {
            $(this).css("background-image", "url(" + $(this).attr("data-background") + ")");
        });

        /*----------------------------------------------
        # Width
        ----------------------------------------------*/
        $("[data-width]").each(function () {
            $(this).css("width", $(this).attr("data-width"));
        });

        /*----------------------------------------------
        # Text Color
        ----------------------------------------------*/
        $("[data-text-color]").each(function () {
            $(this).css("color", $(this).attr("data-text-color"));
        });
        
       /* ================================
       Video & Image Popup Js Start
    ================================ */

      $(".img-popup").magnificPopup({
        type: "image",
        gallery: {
          enabled: true,
        },
      });

      $(".video-popup").magnificPopup({
        type: "iframe",
        callbacks: {},
      });
  
      /* ================================
       Counterup Js Start
    ================================ */

      $(".count").counterUp({
        delay: 15,
        time: 4000,
      });
  
      /* ================================
       Wow Animation Js Start
    ================================ */

      new WOW().init();
  
      /* ================================
       Nice Select Js Start
    ================================ */

    if ($('.single-select').length) {
        $('.single-select').niceSelect();
    }

      /* ================================
      Hover Active Js Start
    ================================ */

    $(".service-card-items-two ").hover(
		// Function to run when the mouse enters the element
		function () {
			// Remove the "active" class from all elements
			$(".service-card-items-two").removeClass("active");
			// Add the "active" class to the currently hovered element
			$(this).addClass("active");
		}
	);


    /* ================================
      Custom Accordion Js Start
    ================================ */

    if ($('.accordion-box').length) {
        $(".accordion-box").on('click', '.acc-btn', function () {
            var outerBox = $(this).closest('.accordion-box');
            var target = $(this).closest('.accordion');
            var accBtn = $(this);
            var accContent = accBtn.next('.acc-content');

            if (target.hasClass('active-block')) {
                // Already open, so close it
                accBtn.removeClass('active');
                target.removeClass('active-block');
                accContent.slideUp(300);
            } else {
                // Close all others
                outerBox.find('.accordion').removeClass('active-block');
                outerBox.find('.acc-btn').removeClass('active');
                outerBox.find('.acc-content').slideUp(300);

                // Open clicked one
                accBtn.addClass('active');
                target.addClass('active-block');
                accContent.slideDown(300);
            }
        });
    }

   if ($('.hero-slider-2').length > 0) {
        const heroSlider2 = new Swiper(".hero-slider-2", {
            loop: true,
            speed: 1000,
            effect: "fade",
            fadeEffect: {
                crossFade: true,
            },
            autoplay: {
                delay: 4000,
                disableOnInteraction: false,
            },
            navigation: {
                nextEl: ".array-next",
                prevEl: ".array-prev",
            },
        
        });
    }

    /* ================================
      Team Slider Js Start
    ================================ */

    if ($('.team-slider').length > 0) {
    const teamSlider = new Swiper(".team-slider", {
        spaceBetween: 30,
        speed: 1300,
        loop: true,
        autoplay: {
            delay: 2000,
            disableOnInteraction: false,
        },
        navigation: {
            nextEl: ".array-next",
            prevEl: ".array-prev",
        },
        pagination: {
            el: ".dot",
            clickable: true,
        },
        breakpoints: {

            1199: {
                slidesPerView: 4,
            },
            991: {
                slidesPerView: 3,
            },
            767: {
                slidesPerView: 2.5,
            },
            575: {
                slidesPerView: 1.4,
            },
            400: {
                slidesPerView: 1,
            },
             0: {
                slidesPerView: 1,
            },
        },
    });
    }

    if ($('.testimonial-slider').length > 0) {
        const testimonialSlider = new Swiper(".testimonial-slider", {
            spaceBetween: 30,
            speed: 1300,
            loop: true,
            centeredSlides: true,
            autoplay: {
                delay: 2000,
                disableOnInteraction: false,
            },
            navigation: {
                nextEl: ".array-next",
                prevEl: ".array-prev",
            },
            pagination: {
                el: ".dot2",
                clickable: true,
            },
            breakpoints: {
                1399: {
                    slidesPerView: 4,
                },
                1199: {
                    slidesPerView: 3.4,
                },
                991: {
                    slidesPerView: 3,
                },
                767: {
                    slidesPerView: 2,
                },
                575: {
                    slidesPerView: 1.5,
                },
                0: {
                    slidesPerView: 1.2,
                },
            },
        });
    }

    if ($('.testimonial-slider-2').length > 0) {
        const testimonialSlider2 = new Swiper(".testimonial-slider-2", {
            spaceBetween: 30,
            speed: 1300,
            loop: true,
            autoplay: {
                delay: 2000,
                disableOnInteraction: false,
            },
            breakpoints: {
                1199: {
                    slidesPerView: 2,
                },
                991: {
                    slidesPerView: 1,
                },
                767: {
                    slidesPerView: 1,
                },
                575: {
                    slidesPerView: 1,
                },
                0: {
                    slidesPerView: 1,
                },
            },
        });
    }

    /* ================================
       GT Brand Slider Js Start
    ================================ */

    if($('.gt-brand-slider').length > 0) {
        const gtBrandSlider = new Swiper(".gt-brand-slider", {
            spaceBetween: 30,
            speed: 1300,
            loop: true,
            //centeredSlides: true,
            autoplay: {
                delay: 2000,
                disableOnInteraction: false,
            },
            navigation: {
                nextEl: ".array-prev",
                prevEl: ".array-next",
            },
            breakpoints: {
                1399: {
                    slidesPerView: 6,
                },
                1199: {
                    slidesPerView: 5,
                },
                991: {
                    slidesPerView: 4,
                },
                767: {
                    slidesPerView: 3,
                },
                575: {
                    slidesPerView: 2,
                },
                400: {
                    slidesPerView: 2,
                },
                0: {
                    slidesPerView: 1,
                },
            },
        });
    }

     if($('.gt-product-tour-slider').length > 0) {
        const gtProductTourSlider = new Swiper(".gt-product-tour-slider", {
            spaceBetween: 30,
            speed: 1300,
            loop: true,
            centeredSlides: true,
            //  pagination: {
            //     el: ".dot",
            //     clickable: true,
            // },
             pagination: {
                el: ".gt-product-dot",
                clickable: true,
                renderBullet: function(index, className) {
                    const dotContent = document.querySelectorAll(
                        ".gt-product-dot .dot-content"
                    );
                    return `
                <span class="${className}">
                    ${dotContent[index]?.outerHTML || ""}
                </span>
            `;
                },
            },
            breakpoints: {
                1199: {
                    slidesPerView: 3,
                },
                991: {
                    slidesPerView: 2,
                },
                767: {
                    slidesPerView: 1,
                },
                575: {
                    slidesPerView: 1,
                },
                400: {
                    slidesPerView: 1,
                },
                0: {
                    slidesPerView: 1,
                },
            },
        });
    }
    
    /* ================================
      Mobile Slider Js Start
    ================================ */

    if ($('.mobile-slider').length > 0) {
        const mobileSlider = new Swiper(".mobile-slider", {
            spaceBetween: 30,
            speed: 1300,
            loop: true,
            autoplay: {
                delay: 2000,
                disableOnInteraction: false,
            },
            breakpoints: {
                1199: {
                    slidesPerView: 5,
                },
                991: {
                    slidesPerView: 3,
                },
                767: {
                    slidesPerView: 2,
                },
                575: {
                    slidesPerView: 2,
                },
                0: {
                    slidesPerView: 1,
                },
            },
        });
    }
      
     initRipples();

    /*=============================================
        =              Ripples Init               =
    =============================================*/
    function initRipples() {

        $(".ripple-image").each(function () {

            var $container = $(this);
            var $img = $container.find("img").first();

            if (!$img.length) return;

            var img = new Image();
            img.src = $img.attr("src");

            img.onload = function () {

                var imgURL = img.src;

                $container.css({
                    "background-image": "url(" + imgURL + ")",
                    "background-size": "cover",
                    "background-position": "center center"
                });

                if (typeof $container.ripples === "function") {
                    $container.ripples({
                        resolution: 400,
                        perturbance: 0.03,
                        imageUrl: imgURL
                    });
                }

                $img.hide();
            };

        });
    }

   /* ================================
       Gt Hero Image Rotate Style Start
    ================================ */

    if ($('.gt-hero-image').length) {
        $(window).on("scroll", function() {
            var scrollPos = $(this).scrollTop();

            if (scrollPos > 50) {
                $('.gt-hero-left').css('transform', 'rotate(-15deg)');
                $('.gt-hero-right').css('transform', 'rotate(15deg)');
            } else {
                $('.gt-hero-left').css('transform', 'rotate(0deg)');
                $('.gt-hero-right').css('transform', 'rotate(0deg)');
            }
        });
    }

   /* ================================
        Mouse Cursor Animation Js Start
    ================================ */

    if ($(".mouseCursor").length > 0) {
        function itCursor() {
            var myCursor = jQuery(".mouseCursor");
            if (myCursor.length) {
                if ($("body")) {
                    const e = document.querySelector(".cursor-inner"),
                        t = document.querySelector(".cursor-outer");
                    let n, i = 0, o = !1;
                    window.onmousemove = function(s) {
                        if (!o) {
                            t.style.transform = "translate(" + s.clientX + "px, " + s.clientY + "px)";
                        }
                        e.style.transform = "translate(" + s.clientX + "px, " + s.clientY + "px)";
                        n = s.clientY;
                        i = s.clientX;
                    };
                    $("body").on("mouseenter", "button, a, .cursor-pointer", function() {
                        e.classList.add("cursor-hover");
                        t.classList.add("cursor-hover");
                    });
                    $("body").on("mouseleave", "button, a, .cursor-pointer", function() {
                        if (!($(this).is("a", "button") && $(this).closest(".cursor-pointer").length)) {
                            e.classList.remove("cursor-hover");
                            t.classList.remove("cursor-hover");
                        }
                    });
                    e.style.visibility = "visible";
                    t.style.visibility = "visible";
                }
            }
        }
        itCursor();
    }

  
    /* ================================
        Back To Top Button Js Start
    ================================ */
    $windowOn.on('scroll', function() {
        var windowScrollTop = $(this).scrollTop();
        var windowHeight = $(window).height();
        var documentHeight = $(document).height();

        if (windowScrollTop + windowHeight >= documentHeight - 10) {
            $("#back-top").addClass("show");
        } else {
            $("#back-top").removeClass("show");
        }
    });

    $documentOn.on('click', '#back-top', function() {
        $('html, body').animate({ scrollTop: 0 }, 800);
        return false;
    });

    /* ================================
       Search Popup Toggle Js Start
    ================================ */

    if ($(".search-toggler").length) {
        $(".search-toggler").on("click", function(e) {
            e.preventDefault();
            $(".search-popup").toggleClass("active");
            $("body").toggleClass("locked");
        });
    }


	
    /* ================================
       Smooth Scroller And Title Animation Js Start
    ================================ */
    if ($('#smooth-wrapper').length && $('#smooth-content').length) {
        gsap.registerPlugin(ScrollTrigger, ScrollSmoother, SplitText);

        gsap.config({
            nullTargetWarn: false,
        });

        let smoother = ScrollSmoother.create({
            wrapper: "#smooth-wrapper",
            content: "#smooth-content",
            smooth: 2,
            effects: true,
            smoothTouch: 0.1,
            normalizeScroll: false,
            ignoreMobileResize: true,
        });
    }

    /* ================================
       Text Anim Js Start
    ================================ */

      if (
    typeof SplitText !== "undefined" &&
        document.querySelectorAll(".split-title").length > 0
        ) {
    document.querySelectorAll(".split-title").forEach((title) => {

        // split by words + chars (IMPORTANT)
        const split = new SplitText(title, {
        type: "words,chars"
        });

        // add class to chars
        split.chars.forEach((char) => {
        char.classList.add("char");
        });

        // GSAP animation
        gsap.to(split.chars, {
        scrollTrigger: {
            trigger: title,
            start: "top 90%",
            toggleActions: "play none none none"
        },
        duration: 0.8,
        clipPath: "inset(0% 0% -15% 0%)",
        x: 0,
        opacity: 1,
        ease: "power4.out",
        stagger: 0.03
        });

    });
    }

     if (typeof gsap !== "undefined") {
          gsap.registerPlugin(ScrollTrigger, SplitText);

          let mm = gsap.matchMedia();

          mm.add("(min-width: 1200px)", () => {

              let splits = [];

              // ===== tz-sub-tilte =====
              $('.tz-sub-tilte').each(function (index, el) {

              let split = new SplitText(el, {
                  type: "lines,words,chars",
                  linesClass: "split-line"
              });

              splits.push(split);

              gsap.set(split.chars, {
                  opacity: 0,
                  x: 7
              });

              gsap.to(split.chars, {
                  scrollTrigger: {
                  trigger: el,
                  start: "top 90%",
                  end: "top 60%",
                  scrub: 1
                  },
                  x: 0,
                  opacity: 1,
                  duration: 0.7,
                  stagger: 0.2
              });
              });

              // ===== tz-itm-title =====
              $('.tz-itm-title').each(function (index, el) {

              let split = new SplitText(el, {
                  type: "lines,words,chars",
                  linesClass: "split-line"
              });

              splits.push(split);

              gsap.set(split.chars, {
                  opacity: 0.3,
                  x: -7
              });

              gsap.to(split.chars, {
                  scrollTrigger: {
                  trigger: el,
                  start: "top 92%",
                  end: "top 60%",
                  scrub: 1
                  },
                  x: 0,
                  opacity: 1,
                  duration: 0.7,
                  stagger: 0.2
              });
              });

              // ðŸ”¥ MOST IMPORTANT PART
              ScrollTrigger.refresh();

              // ðŸ”¥ cleanup on breakpoint change
              return () => {
              splits.forEach(split => split.revert());
              ScrollTrigger.getAll().forEach(st => st.kill());
              };

          });
    }

     if ($(".wa_title_spilt_1").length) {

    gsap.registerPlugin(SplitText, ScrollTrigger);

    document.querySelectorAll(".wa_title_spilt_1").forEach((atEl) => {

        const atSplit = new SplitText(atEl, {
            type: "words,chars",
            wordsClass: "word",
            charsClass: "char",
        });

        let atDuration = parseFloat(atEl.getAttribute("data-speed")) || 0.6; 
        let atDelay = parseFloat(atEl.getAttribute("data-delay")) || 0;

        if (window.innerWidth <= 768) {
            atDuration = atDuration * 0.5; 
        }

        gsap.set(atSplit.words, {
            willChange: "transform",
            perspective: 1000,
            transformStyle: "preserve-3d",
        });

        gsap.set(atSplit.chars, {
            willChange: "transform",
            opacity: 0,
            rotateX: -80,
            transformOrigin: "center center -10px",
        });

        gsap.set(atEl, {
            perspective: 1000,
            transformStyle: "preserve-3d",
        });

        gsap.to(atSplit.chars, {
            scrollTrigger: {
                trigger: atEl,
                start: "top 85%", 
            },
            opacity: 1,
            rotateX: 0,
            duration: atDuration,
            delay: atDelay,
            ease: "power2.out", 
            stagger: {
                each: 0.025, 
                from: "center",
            },
        });

    });

    }

    
    let mm = gsap.matchMedia();

    mm.add("(min-width: 1199px)", () => {

        let panels = document.querySelectorAll('.oit-panel-pin');

        panels.forEach((section, index) => {

            let startVal = section.dataset.start || 'top 30%';
            let endVal = section.dataset.end || 'bottom 90%';

            gsap.fromTo(
                section,
                {
                    transformOrigin: '100% 0% 0px',
                    x: 0,
                    y: 0,
                    rotate: 0,
                    scale: 1,
                },
                {
                    yPercent: 5,
                    rotate: 20,
                    scale: 0.75,
                    ease: 'none',

                    scrollTrigger: {
                        trigger: section,
                        pin: section,
                        scrub: 1,
                        start: startVal,
                        end: endVal,
                        endTrigger: '.oit-panel-pin-area',
                        pinSpacing: false,
                        markers: false,
                    },
                }
            );

        });

    });


      function initTextSplit() {

            const $elements = $('.tz-split-1');

            if (!$elements.length) return;

            // Check GSAP + SplitText
            if (typeof gsap === "undefined" || typeof SplitText === "undefined") {
                console.warn("GSAP or SplitText not loaded");
                return;
            }

            gsap.registerPlugin(SplitText);

            $elements.each(function () {
                new SplitText(this, {
                    type: "words",
                    wordsClass: "split-line"
                });
            });
        }

        // Init
        initTextSplit();

    const split2 = new SplitText(".text_invert-2", { type: "lines" });

    split2.lines.forEach((target) => {
        gsap.to(target, {
            backgroundPositionX: 0,
            ease: "none",
            scrollTrigger: {
                trigger: target,
                scrub: 1,
                start: 'top 85%',
                end: "bottom center",
            }
        });
    });

    if (window.innerWidth > 1199) {
			const items = document.querySelectorAll(".advance-wrap .advance-item");
			if (items.length < 4) return;

			const advanced = gsap.timeline({
				scrollTrigger: {
				trigger: ".advance-wrap",
				start: "top 60%",
				toggleActions: "play none none reverse",
				markers: false,
				},
				defaults: {
				ease: "power1.out", //
				duration: 1,
				},
			});
			advanced
				.from(items[0], { xPercent: 100, rotate: -8 })
				.from(items[1], { xPercent: 30, rotate: 4.13 }, "<")
				.from(items[2], { xPercent: -30, rotate: -6.42 }, "<")
				.from(items[3], { xPercent: -60, rotate: -12.15 }, "<");
		}

        
        /* ================================
       Sticky Js Start
    ================================ */

    
    

    /*=============================================
        =            Text Split (GSAP)               =
        =============================================*/
        function initTextSplit() {

            const $elements = $('.tz-split-1');

            if (!$elements.length) return;

            // Check GSAP + SplitText
            if (typeof gsap === "undefined" || typeof SplitText === "undefined") {
                console.warn("GSAP or SplitText not loaded");
                return;
            }

            gsap.registerPlugin(SplitText);

            $elements.each(function () {
                new SplitText(this, {
                    type: "words",
                    wordsClass: "split-line"
                });
            });
        }

        // Init
        initTextSplit();

      if ($(".hero-animation").length) {

        $(".hero-animation").each(function () {

            let $this = $(this);

            // 1199px and below disable
            if (window.innerWidth <= 1199) return;

            gsap.timeline({
                scrollTrigger: {
                    trigger: $this[0],
                    start: "top 60%",
                    end: "top 10%",
                    scrub: true,
                    markers: false,
                }
            })

            .from($this[0], {
                rotateX: 40,
                y: -180,
                duration: 2,
                ease: "power2.out",
                transformOrigin: "bottom center",
                force3D: true,
            });

        });

    }

   

    /* ================================
       Service Panel Js Start
    ================================ */

	
        /*=============================================
        =            CLIP ANIMATION FUNCTION           =
        =============================================*/
        function initClipAnimation() {

            const $wrappers = document.querySelectorAll(".tp-clip-anim");
            if (!$wrappers.length) return;

            const observer = new IntersectionObserver(function (entries, observerInstance) {

                entries.forEach(function (entry) {

                    if (!entry.isIntersecting) return;

                    const wrapper = entry.target;
                    const img = wrapper.querySelector(".tp-anim-img[data-animate='true']");
                    if (!img) return;

                    const url = img.getAttribute("src");

                    if (getComputedStyle(wrapper).position === "static") {
                        wrapper.style.position = "relative";
                    }

                    wrapper.querySelectorAll(".mask").forEach(function (mask) {
                        mask.remove();
                    });

                    const fragment = document.createDocumentFragment();

                    for (let i = 0; i < 9; i++) {
                        const mask = document.createElement("div");
                        mask.className = "mask mask-" + (i + 1);
                        mask.style.backgroundImage = "url(" + url + ")";
                        fragment.appendChild(mask);
                    }

                    wrapper.appendChild(fragment);
                    observerInstance.unobserve(wrapper);

                });

            }, { threshold: 0.2 });

            $wrappers.forEach(function (wrapper) {
                observer.observe(wrapper);
            });
        }

        /*=============================================
        =                 INIT FUNCTION               =
        =============================================*/
        function init() {
            initClipAnimation();
        }

        // ✅ ONLY ONE READY → call
        init();


        
  
    }); // End Document Ready Function

         /* ================================
      Pricing Toggle Js Start
    ================================ */

    document.addEventListener("DOMContentLoaded", () => {
        const monthlyBtn = document.querySelector(".monthly-label");
        const yearlyBtn = document.querySelector(".yearly-label");
        const prices = document.querySelectorAll(".price");

        // Only run if the page has the pricing elements
        if (!monthlyBtn || !yearlyBtn || prices.length === 0) return;

        let isAnimating = false;

        function changePrice(type) {
            if (isAnimating) return; // Prevent double click bug
            isAnimating = true;

            prices.forEach(price => {
                price.classList.add("fade-out");

                setTimeout(() => {
                    const value = price.dataset[type];
                    const period = type === "monthly" ? "months" : "year";

                    price.innerHTML = `$${value}<sub>/ ${period}</sub>`;

                    price.classList.remove("fade-out");
                    price.classList.add("fade-in");

                    setTimeout(() => {
                        price.classList.remove("fade-in");
                        isAnimating = false;
                    }, 300);
                }, 300);
            });
        }

        monthlyBtn.addEventListener("click", function () {
            if (!this.classList.contains("active")) {
                monthlyBtn.classList.add("active");
                yearlyBtn.classList.remove("active");
                changePrice("monthly");
            }
        });

        yearlyBtn.addEventListener("click", function () {
            if (!this.classList.contains("active")) {
                yearlyBtn.classList.add("active");
                monthlyBtn.classList.remove("active");
                changePrice("yearly");
            }
        });
    });

    let pr = gsap.matchMedia();
	pr.add("(min-width: 1199px)", () => {
		let tl = gsap.timeline();
		let panels = document.querySelectorAll('.tp-panel-pin')
		panels.forEach((section, index) => {
			tl.to(section, {
				scrollTrigger: {
					trigger: section,
					pin: section,
					scrub: 1,
					start: 'top 14%',
					end: "bottom 85%",
					endTrigger: '.tp-panel-pin-area',
					pinSpacing: false,
					markers: false,
				},
			})
		})
	});
    /* ================================
    Preloader Js Start
    ================================ */
   

	$(window).on('load', function(event) {
		$('#preloader').delay(500).fadeOut(500);
	});

  
  })(jQuery); // End jQuery

