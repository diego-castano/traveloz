(function ($) {
    "use strict";
    
    // Sticky Header con hide/show en scroll
    (function() {
        const header = document.querySelector('.header-area');
        if (!header) return;
        
        let lastScrollY = window.scrollY;
        let ticking = false;
        const scrollThreshold = 80; // Píxeles antes de activar el estado compacto
        
        function updateHeader() {
            const currentScrollY = window.scrollY;
            
            // Agregar/quitar clase scrolled (versión compacta)
            if (currentScrollY > scrollThreshold) {
                header.classList.add('scrolled');
            } else {
                header.classList.remove('scrolled');
            }
            
            // Hide on scroll down, show on scroll up
            if (currentScrollY > lastScrollY && currentScrollY > 150) {
                // Scrolling down - ocultar
                header.classList.add('hidden');
            } else {
                // Scrolling up - mostrar
                header.classList.remove('hidden');
            }
            
            lastScrollY = currentScrollY;
            ticking = false;
        }
        
        window.addEventListener('scroll', function() {
            if (!ticking) {
                window.requestAnimationFrame(updateHeader);
                ticking = true;
            }
        });
        
        // Check inicial
        updateHeader();
    })();
    
    jQuery(document).ready(function ($) {


        $('.image-box-slider').slick({
            dots: true,
            arrows: true,
            speed: 600,
            slidesToShow: 3,
            slidesToScroll: 1,
            centerMode: false,
            autoplay: true,
            infinite: true,
            autoplaySpeed: 4000,
            prevArrow: "<button class='slick-prev slick-arrow slick-disabled' aria label='Previous' type='button' aria-disabled='true'><span><svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 640 640'><path fill='#9A9A9A' d='M169.4 297.4C156.9 309.9 156.9 330.2 169.4 342.7L361.4 534.7C373.9 547.2 394.2 547.2 406.7 534.7C419.2 522.2 419.2 501.9 406.7 489.4L237.3 320L406.6 150.6C419.1 138.1 419.1 117.8 406.6 105.3C394.1 92.8 373.8 92.8 361.3 105.3L169.3 297.3z'/></svg></span><span class='d-none'>PREV</span></button>",
            nextArrow: "<button class='slick-next slick-arrow' aria-label='Next' type='button' aria-disabled='false'><span><svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 640 640'> <path fill='#9A9A9A' d='M471.1 297.4C483.6 309.9 483.6 330.2 471.1 342.7L279.1 534.7C266.6 547.2 246.3 547.2 233.8 534.7C221.3 522.2 221.3 501.9 233.8 489.4L403.2 320L233.9 150.6C221.4 138.1 221.4 117.8 233.9 105.3C246.4 92.8 266.7 92.8 279.2 105.3L471.2 297.3z' /> </svg></span><span class='d-none'>NEXT</span></button>",
            responsive: [
                {
                    breakpoint: 1200,
                    settings: {
                        slidesToShow: 3,
                    }
                },
                {
                    breakpoint: 991,
                    settings: {
                         slidesToShow: 1,
                        centerMode: true,
                        autoplay:false
                    }
                },
                {
                    breakpoint: 800,
                    settings: {
                         slidesToShow: 1,
                        centerMode: true,
                        autoplay:false
                    }
                },
                {
                    breakpoint: 750,
                    settings: {
                         slidesToShow: 1,
                        centerMode: true,
                        autoplay:false
                    }
                },
                {
                    breakpoint: 600,
                    settings: {
                        slidesToShow: 1,
                        centerMode: true,
                        autoplay:false
                    }
                },
                {
                    breakpoint: 480,
                    settings: {
                        slidesToShow: 1,
                        centerMode: true,
                        autoplay:false
                    }
                }

              ]
        });

      

        $('.box-slider').slick({
            dots: false,
            arrows: true,
            speed: 600,
            slidesToShow: 3,
            slidesToScroll: 1,
            centerMode: false,
            autoplay: true,
            infinite: true,
            autoplaySpeed: 4000,
            prevArrow: "<button class='slick-prev slick-arrow slick-disabled' aria label='Previous' type='button' aria-disabled='true'><span><svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 640 640'><path fill='#9A9A9A' d='M169.4 297.4C156.9 309.9 156.9 330.2 169.4 342.7L361.4 534.7C373.9 547.2 394.2 547.2 406.7 534.7C419.2 522.2 419.2 501.9 406.7 489.4L237.3 320L406.6 150.6C419.1 138.1 419.1 117.8 406.6 105.3C394.1 92.8 373.8 92.8 361.3 105.3L169.3 297.3z'/></svg></span><span class='d-none'>PREV</span></button>",
            nextArrow: "<button class='slick-next slick-arrow' aria-label='Next' type='button' aria-disabled='false'><span><svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 640 640'> <path fill='#9A9A9A' d='M471.1 297.4C483.6 309.9 483.6 330.2 471.1 342.7L279.1 534.7C266.6 547.2 246.3 547.2 233.8 534.7C221.3 522.2 221.3 501.9 233.8 489.4L403.2 320L233.9 150.6C221.4 138.1 221.4 117.8 233.9 105.3C246.4 92.8 266.7 92.8 279.2 105.3L471.2 297.3z' /> </svg></span><span class='d-none'>NEXT</span></button>",
            responsive: [
                {
                    breakpoint: 1200,
                    settings: {
                        slidesToShow: 3,
                    }
                },
                {
                    breakpoint: 991,
                    settings: {
                        slidesToShow: 3,
                    }
                },
                {
                    breakpoint: 800,
                    settings: {
                        slidesToShow: 2,
                    }
                },
                {
                    breakpoint: 750,
                    settings: {
                        slidesToShow: 2,
                    }
                },
                {
                    breakpoint: 600,
                    settings: {
                        slidesToShow: 1,
                    }
                },
                {
                    breakpoint: 480,
                    settings: {
                        slidesToShow: 1,
                    }
                }

              ]
        });


        $('.destinos-slider').slick({
            dots: false,
            arrows: true,
            speed: 600,
            slidesToShow: 3,
            slidesToScroll: 1,
            centerMode: false,
            autoplay: true,
            infinite: true,
            autoplaySpeed: 4000,
            prevArrow: "<button class='slick-prev slick-arrow slick-disabled' aria label='Previous' type='button' aria-disabled='true'><span><svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 640 640'><path fill='#785AE5' d='M169.4 297.4C156.9 309.9 156.9 330.2 169.4 342.7L361.4 534.7C373.9 547.2 394.2 547.2 406.7 534.7C419.2 522.2 419.2 501.9 406.7 489.4L237.3 320L406.6 150.6C419.1 138.1 419.1 117.8 406.6 105.3C394.1 92.8 373.8 92.8 361.3 105.3L169.3 297.3z'/></svg></span><span class='d-none'>PREV</span></button>",
            nextArrow: "<button class='slick-next slick-arrow' aria-label='Next' type='button' aria-disabled='false'><span><svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 640 640'> <path fill='#785AE5' d='M471.1 297.4C483.6 309.9 483.6 330.2 471.1 342.7L279.1 534.7C266.6 547.2 246.3 547.2 233.8 534.7C221.3 522.2 221.3 501.9 233.8 489.4L403.2 320L233.9 150.6C221.4 138.1 221.4 117.8 233.9 105.3C246.4 92.8 266.7 92.8 279.2 105.3L471.2 297.3z' /> </svg></span><span class='d-none'>NEXT</span></button>",
            responsive: [
                {
                    breakpoint: 1200,
                    settings: {
                        slidesToShow: 3,
                    }
                },
                {
                    breakpoint: 991,
                    settings: {
                        slidesToShow: 3,
                    }
                },
                {
                    breakpoint: 800,
                    settings: {
                        slidesToShow: 2,
                    }
                },
                {
                    breakpoint: 750,
                    settings: {
                        slidesToShow: 2,
                    }
                },
                {
                    breakpoint: 600,
                    settings: {
                        slidesToShow: 2,
                    }
                },
                {
                    breakpoint: 480,
                    settings: {
                        slidesToShow: 1,
                    }
                }

              ]
        });

        $('.image-text-slider').slick({
            dots: false,
            arrows: true,
            speed: 600,
            slidesToShow: 1,
            slidesToScroll: 1,
            centerMode: false,
            autoplay: true,
            infinite: true,
            autoplaySpeed: 4000,
            prevArrow: "<button class='slick-prev slick-arrow slick-disabled' aria label='Previous' type='button' aria-disabled='true'><span><svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 640 640'><path fill='#9A9A9A' d='M169.4 297.4C156.9 309.9 156.9 330.2 169.4 342.7L361.4 534.7C373.9 547.2 394.2 547.2 406.7 534.7C419.2 522.2 419.2 501.9 406.7 489.4L237.3 320L406.6 150.6C419.1 138.1 419.1 117.8 406.6 105.3C394.1 92.8 373.8 92.8 361.3 105.3L169.3 297.3z'/></svg></span><span class='d-none'>PREV</span></button>",
            nextArrow: "<button class='slick-next slick-arrow' aria-label='Next' type='button' aria-disabled='false'><span><svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 640 640'> <path fill='#9A9A9A' d='M471.1 297.4C483.6 309.9 483.6 330.2 471.1 342.7L279.1 534.7C266.6 547.2 246.3 547.2 233.8 534.7C221.3 522.2 221.3 501.9 233.8 489.4L403.2 320L233.9 150.6C221.4 138.1 221.4 117.8 233.9 105.3C246.4 92.8 266.7 92.8 279.2 105.3L471.2 297.3z' /> </svg></span><span class='d-none'>NEXT</span></button>",
            responsive: [
                {
                    breakpoint: 1200,
                    settings: {
                        slidesToShow: 1,
                    }
                },
                {
                    breakpoint: 991,
                    settings: {
                        slidesToShow: 3,
                    }
                },
                {
                    breakpoint: 800,
                    settings: {
                        slidesToShow: 2,
                    }
                },
                {
                    breakpoint: 750,
                    settings: {
                        slidesToShow: 2,
                    }
                },
                {
                    breakpoint: 600,
                    settings: {
                        slidesToShow: 1,
                    }
                },
                {
                    breakpoint: 480,
                    settings: {
                        slidesToShow: 1,
                    }
                }

              ]
        });





        $('.image-slider.style3').slick({
            dots: false,
            arrows: true,
            speed: 600,
            slidesToShow: 1,
            slidesToScroll: 1,
            centerMode: false,
            autoplay: true,
            infinite: true,
            autoplaySpeed: 4000,
            prevArrow: "<button class='slick-prev slick-arrow slick-disabled' aria label='Previous' type='button' aria-disabled='true'><span><svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 640 640'><path fill='#fff' d='M169.4 297.4C156.9 309.9 156.9 330.2 169.4 342.7L361.4 534.7C373.9 547.2 394.2 547.2 406.7 534.7C419.2 522.2 419.2 501.9 406.7 489.4L237.3 320L406.6 150.6C419.1 138.1 419.1 117.8 406.6 105.3C394.1 92.8 373.8 92.8 361.3 105.3L169.3 297.3z'/></svg></span><span class='d-none'>PREV</span></button>",
            nextArrow: "<button class='slick-next slick-arrow' aria-label='Next' type='button' aria-disabled='false'><span><svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 640 640'> <path fill='#fff' d='M471.1 297.4C483.6 309.9 483.6 330.2 471.1 342.7L279.1 534.7C266.6 547.2 246.3 547.2 233.8 534.7C221.3 522.2 221.3 501.9 233.8 489.4L403.2 320L233.9 150.6C221.4 138.1 221.4 117.8 233.9 105.3C246.4 92.8 266.7 92.8 279.2 105.3L471.2 297.3z' /> </svg></span><span class='d-none'>NEXT</span></button>",
            
        });
        
        
        $('.icon-teaser-slider').slick({
            dots: false,
            arrows: false,
            speed: 600,
            slidesToShow: 3,
            slidesToScroll: 1,
            centerMode: false,
            autoplay: true,
            infinite: true,
            autoplaySpeed: 4000,
            prevArrow: "<button class='slick-prev slick-arrow slick-disabled' aria label='Previous' type='button' aria-disabled='true'><span><svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 640 640'><path fill='#777' d='M169.4 297.4C156.9 309.9 156.9 330.2 169.4 342.7L361.4 534.7C373.9 547.2 394.2 547.2 406.7 534.7C419.2 522.2 419.2 501.9 406.7 489.4L237.3 320L406.6 150.6C419.1 138.1 419.1 117.8 406.6 105.3C394.1 92.8 373.8 92.8 361.3 105.3L169.3 297.3z'/></svg></span><span class='d-none'>PREV</span></button>",
            nextArrow: "<button class='slick-next slick-arrow' aria-label='Next' type='button' aria-disabled='false'><span><svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 640 640'> <path fill='#777' d='M471.1 297.4C483.6 309.9 483.6 330.2 471.1 342.7L279.1 534.7C266.6 547.2 246.3 547.2 233.8 534.7C221.3 522.2 221.3 501.9 233.8 489.4L403.2 320L233.9 150.6C221.4 138.1 221.4 117.8 233.9 105.3C246.4 92.8 266.7 92.8 279.2 105.3L471.2 297.3z' /> </svg></span><span class='d-none'>NEXT</span></button>",
            responsive: [
                {
                    breakpoint: 1200,
                    settings: {
                        slidesToShow: 3,
                    }
                },
                {
                    breakpoint: 991,
                    settings: {
                         slidesToShow: 1,
                        centerMode: true,
                        autoplay:false,
                        dots: true,
                        arrows: true,
                    }
                },
                {
                    breakpoint: 800,
                    settings: {
                         slidesToShow: 1,
                        centerMode: true,
                        autoplay:false,
                        dots: true,
                        arrows: true,
                    }
                },
                {
                    breakpoint: 750,
                    settings: {
                         slidesToShow: 1,
                       centerMode: true,
                        autoplay:false,
                        dots: true,
                        arrows: true,
                    }
                },
                {
                    breakpoint: 600,
                    settings: {
                        slidesToShow: 1,
                        centerMode: true,
                        autoplay:false,
                        dots: true,
                        arrows: true,
                    }
                },
                {
                    breakpoint: 480,
                    settings: {
                        slidesToShow: 1,
                        centerMode: true,
                        autoplay:false,
                        dots: true,
                        arrows: true,
                    }
                }

              ]
        });
        
        $('.logo-slider').slick({
            dots: false,
            arrows: false,
            speed: 600,
            slidesToShow: 3,
            slidesToScroll: 1,
            centerMode: false,
            autoplay: true,
            infinite: true,
            autoplaySpeed: 4000,
            prevArrow: "<button class='slick-prev slick-arrow slick-disabled' aria label='Previous' type='button' aria-disabled='true'><span><svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 640 640'><path fill='#777' d='M169.4 297.4C156.9 309.9 156.9 330.2 169.4 342.7L361.4 534.7C373.9 547.2 394.2 547.2 406.7 534.7C419.2 522.2 419.2 501.9 406.7 489.4L237.3 320L406.6 150.6C419.1 138.1 419.1 117.8 406.6 105.3C394.1 92.8 373.8 92.8 361.3 105.3L169.3 297.3z'/></svg></span><span class='d-none'>PREV</span></button>",
            nextArrow: "<button class='slick-next slick-arrow' aria-label='Next' type='button' aria-disabled='false'><span><svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 640 640'> <path fill='#777' d='M471.1 297.4C483.6 309.9 483.6 330.2 471.1 342.7L279.1 534.7C266.6 547.2 246.3 547.2 233.8 534.7C221.3 522.2 221.3 501.9 233.8 489.4L403.2 320L233.9 150.6C221.4 138.1 221.4 117.8 233.9 105.3C246.4 92.8 266.7 92.8 279.2 105.3L471.2 297.3z' /> </svg></span><span class='d-none'>NEXT</span></button>",
            responsive: [
                {
                    breakpoint: 1200,
                    settings: {
                        slidesToShow: 3,
                    }
                },
                {
                    breakpoint: 991,
                    settings: {
                         slidesToShow: 1,
                        centerMode: true,
                        autoplay:false,
                        dots: true,
                        arrows: true,
                    }
                },
                {
                    breakpoint: 800,
                    settings: {
                         slidesToShow: 4,
                        centerMode: true,
                        autoplay:false,
                        dots: false,
                        arrows: true,
                    }
                },
                {
                    breakpoint: 750,
                    settings: {
                         slidesToShow: 4,
                        centerMode: true,
                        autoplay:false,
                        dots: false,
                        arrows: true,
                    }
                },
                {
                    breakpoint: 600,
                    settings: {
                         slidesToShow: 3,
                        centerMode: true,
                        autoplay:false,
                        dots: false,
                        arrows: true,
                    }
                },
                {
                    breakpoint: 480,
                    settings: {
                        slidesToShow: 2,
                        centerMode: true,
                        autoplay:false,
                        dots: false,
                        arrows: true,
                    }
                }

              ]
        });


        //Mobile Menu Start
        $(document).ready(function () {
            $(".menu-item-has-children").prepend("<span></span>");
        });
        $(document).on('click', '.menu-item-has-children > span', function (event) {
            $(this).parent().find("ul").toggleClass("active");
            $(this).parent().toggleClass("active");
        });

        $(".mainmenu ul li:has(ul)").addClass("has-submenu");
        $(".mainmenu ul li:has(ul)").addClass("small-submenu");
        $(".mainmenu ul li ul").addClass("sub-menu");
        $(".mainmenu ul.dropdown li").hover(function () {
            $(this).addClass("hover");
        }, function () {
            $(this).removeClass("hover");
        });
        var $menu = $("#menu"),
            $menulink = $("#menu-toggle"),
            $header = $(".header-area"),
            $searchTrigger = $(".searchToggle"),
            $menuTriggercont = $("#menu_handler"),
            $menuTrigger = $(".has-submenu > span"),
            $body = $("body"),
            $megamenuTrigger = $(".megamenu > li > span");
        $menulink.click(function (e) {
            $menulink.toggleClass("active");
            $menu.toggleClass("active");
            $menuTriggercont.toggleClass("active");
            $header.toggleClass("active");
            $body.toggleClass("active");
        });

        $menuTrigger.click(function (e) {
            e.preventDefault();
            var t = $(this).next();
            t.toggleClass("active");
            t.toggleClass("active").next("ul").toggleClass("active");
            t.toggleClass("active").next(".megamenu-holder").toggleClass("active");
        });

        $megamenuTrigger.click(function (e) {
            e.preventDefault();
            var t = $(this).next();
            t.toggleClass("active").next(".mega-submenu").toggleClass("active");
        });

        $searchTrigger.click(function (e) {
            $menulink.removeClass("active");
            $menu.removeClass("active");

            $menuTriggercont.removeClass("active");
        });

        $(".mainmenu ul li:has(ul)");
        //Mobile Menu End






    });
}(jQuery));

const picker = new Litepicker({
    element: document.getElementById('dateRange'),
    singleMode: false,
    numberOfMonths: 1,
    numberOfColumns: 1,
    format: 'DD MMM YYYY',
    lang: 'es-ES',
    tooltipText: {
        one: 'día',
        other: 'días'
    },
    tooltipNumber: (totalDays) => totalDays,
});

const input = document.getElementById('passengerInput');
const dropdown = document.getElementById('passengerDropdown');

let counts = {
    adult: 0,
    child: 0,
    infant: 0
};

input.addEventListener('click', () => {
    dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
});

document.querySelectorAll('.counter button').forEach(btn => {
    btn.addEventListener('click', () => {
        const type = btn.dataset.type;
        const action = btn.dataset.action;

        if (action === 'plus') counts[type]++;
        if (action === 'minus' && counts[type] > 0) counts[type]--;

        document.getElementById(type + 'Count').innerText = counts[type];
        updateText();
    });
});

function updateText() {
    const total = counts.adult + counts.child + counts.infant;
    document.getElementById('passengerText').innerText =
        total > 0 ? `${total} Pasajeros` : '0 Pasajeros';
}

// close on outside click
document.addEventListener('click', e => {
    if (!e.target.closest('.passenger-select')) {
        dropdown.style.display = 'none';
    }
});

const prefInput = document.getElementById('preferenciaInput');
const prefDropdown = document.getElementById('preferenciaDropdown');
const prefText = document.getElementById('preferenciaText');
const prefValue = document.getElementById('preferenciaValue');

// toggle dropdown
prefInput.addEventListener('click', () => {
    prefDropdown.style.display =
        prefDropdown.style.display === 'block' ? 'none' : 'block';
});

// select option
document.querySelectorAll('#preferenciaDropdown .dr-option').forEach(option => {
    option.addEventListener('click', (e) => {
        e.preventDefault();

        const value = option.innerText;

        prefText.innerText = value;
        prefValue.value = value;

        prefDropdown.style.display = 'none';
    });
});

// close on outside click
document.addEventListener('click', (e) => {
    if (!e.target.closest('.passenger-select')) {
        prefDropdown.style.display = 'none';
    }
});
