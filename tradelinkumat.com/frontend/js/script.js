(function ($) {
    "use strict";

    $(document).ready(function(){
        $('[data-toggle="tooltip"]').tooltip();
    });

    $('.nav_profile_menu').on('click', function () {
        $(this).toggleClass("active");
        $('.nav_profile_menu ul.nav-submenu').toggleClass("open");
    });


    /*=====================
     02. Tap to Top
     ==========================*/
    $(window).on('scroll', function () {
        if ($(this).scrollTop() > 600) {
            $('.tap-top').addClass('top');
        } else {
            $('.tap-top').removeClass('top');
        }
    });

    $('.tap-top').on('click', function () {
        $("html, body").animate({
            scrollTop: 0
        }, 600);
        return false;
    });



    /*=====================
     04. Menu js
     ==========================*/
    $(".toggle-nav, .sidebar-toggle").on('click', function() {
        $('.nav-menu').addClass("open");
        $(".customizer-wrap").removeClass("open");
        $('.left-sidebar').css("left","-365px").removeClass("open");
        $('.left-sidebar').removeClass("open");
        if ($('.nav-menu').hasClass("open")) {
            $('.bg-overlay').addClass("active");
        }
    });
    $(".mobile-back").on('click', function() {
        $('.nav-menu').removeClass("open");
        $('.bg-overlay').removeClass("active");
    });

    var contentwidth = $(window).width();
    if ((contentwidth) <= '1199') {
        $('<div class="bg-overlay"></div>').appendTo($('header'));
        $('.menu-title').append('<span class="according-menu">+</span>');
        $('.menu-title').on('click', function() {
            $('.menu-title').removeClass('active').find('span').replaceWith('<span class="according-menu">+</span>');
            $('.menu-content').slideUp('normal');
            if ($(this).next().is(':hidden') == true) {
                $(this).addClass('active');
                $(this).find('span').replaceWith('<span class="according-menu">-</span>');
                $(this).next().slideDown('normal');
            } else {
                $(this).find('span').replaceWith('<span class="according-menu">+</span>');
            }
        });
        $('.menu-content').hide();
    }

    var contentwidth = $(window).width();
    if ((contentwidth) <= '1199') {
        $('.menu-title-level1').append('<span class="according-menu">+</span>');
        $('.menu-title-level1').on('click', function() {
            $('.menu-title-level1').removeClass('active').find('span').replaceWith('<span class="according-menu">+</span>');
            $('.level1').slideUp('normal');
            if ($(this).next().is(':hidden') == true) {
                $(this).addClass('active');
                $(this).find('span').replaceWith('<span class="according-menu">-</span>');
                $(this).next().slideDown('normal');
            } else {
                $(this).find('span').replaceWith('<span class="according-menu">+</span>');
            }
        });
        $('.nav-sub-childmenu .level1').hide();
    }

    var contentwidth = $(window).width();
    if ((contentwidth) <= '1199') {
        $('.submenu-title').append('<span class="according-menu">+</span>');
        $('.submenu-title').on('click', function() {
            $('.submenu-title').removeClass('active').find('span').replaceWith('<span class="according-menu">+</span>');
            $('.submenu-content').slideUp('normal');
            if ($(this).next().is(':hidden') == true) {
                $(this).addClass('active');
                $(this).find('span').replaceWith('<span class="according-menu">-</span>');
                $(this).next().slideDown('normal');
            } else {
                $(this).find('span').replaceWith('<span class="according-menu">+</span>');
            }
        });
        $('.submenu-content').hide();
    }



    /*=====================
     05. Image to background js
     ==========================*/
    $(".bg-top").parent().addClass('b-top');
    $(".bg-bottom").parent().addClass('b-bottom');
    $(".bg-center").parent().addClass('b-center');
    $(".bg-left").parent().addClass('b-left');
    $(".bg-right").parent().addClass('b-right');
    $(".bg_size_content").parent().addClass('b_size_content');
    $(".bg-img").parent().addClass('bg-size');
    $(".bg-img.blur-up").parent().addClass('blur-up lazyload');
    $('.bg-img').each(function () {

        var el = $(this),
            src = el.attr('src'),
            parent = el.parent();


        parent.css({
            'background-image': 'url(' + src + ')',
            'background-size': 'cover',
            'background-position': 'center',
            'background-repeat': 'no-repeat',
            'display': 'block'
        });

        el.hide();
    });



     /*=====================
     07. filter js
     ==========================*/
     $(".dropdown-menu a").on('click', function() {
        var a = $(this).closest("a");
        var getSampling = a.text();
        $(this).closest(".dropdown-menu").prev('.dropdown-toggle').find('span').text(getSampling);
     });

     $('.mobile-filter').on('click', function(e) {
        $('.left-sidebar').css("left","-1px");
        $(".customizer-wrap").removeClass("open");
        $('.nav-menu').removeClass("open");
      });
     $('.back-btn').on('click', function(e) {
        $('.left-sidebar').css("left","-365px");
     });

     $(".view-map").on('click', function() {
        $('.onclick-map').slideToggle('show');
     });

     // advance filter js
    var width_content = $(window).width();
    if ((width_content) > '991') {

        $(".filter-bottom-title").on('click', function() {
            $(".filter-bottom-content").slideToggle("");
        });
    }
    else {
        $(".filter-bottom-title").on('click', function() {
            $(".filter-bottom-content").toggleClass("open");
            $(".customizer-wrap").removeClass("open");
        });
        $(".close-filter-bottom").on('click', function() {
            $(".filter-bottom-content").removeClass("open");
        });
    }


    $(".top-bar-7 .close-filter-bottom").on('click', function() {
        $(".filter-bottom-content").removeClass("open");
        $(".filter-bottom-content").slideToggle("");
    });


     /*=====================
     08. search js
     ==========================*/
     $(".search-icon").on('click', function() {
        $('.search-box').toggleClass('open');
     });



     /*=====================
     09. responsive setting js
     ==========================*/
     $(".search-sm").on('click', function() {
        $('.sm-input').toggleClass('open');
     });

     $(".top-right-toggle").on('click', function() {
        $('.top-bar-right').toggleClass('open');
     });


     /*=====================
     10. fixed header js
     ==========================*/
     $(window).scroll(function () {
        var scroll = $(window).scrollTop();
        if (scroll >= 600) {
            $(".fixed-header").addClass("fixed");
        } else {
            $(".fixed-header").removeClass("fixed");
        }
    });

    $(".toggle-center").on('click', function() {
        $('.center-responsive').toggleClass('open');
     });



    $(".custom-dropdown .custom-title").on('click', function() {
        $(this).parent().find('.custom-dropdown-menu').toggleClass("show");
    });

})(jQuery);


/*=====================
    13. nav-menu JS
    ==========================*/

$(document).mouseup(function(e) {
    var dropdownMenu = $(".custom-dropdown-menu");
    if (!dropdownMenu.is(e.target) &&
        dropdownMenu.has(e.target).length === 0) {
        $(".custom-dropdown-menu").removeClass("show");
    }
    var menuOutside = $(".nav-menu");
    if (!menuOutside.is(e.target) &&
        menuOutside.has(e.target).length === 0) {
        $(".nav-menu").removeClass("open");
        $(".bg-overlay").removeClass("active");
    }
});


/*=====================
    14. Other JS
    ==========================*/
$('#mapmodal').on('shown.bs.modal', function () {
    map.getViewPort().resize();
});

function readURL( uploader ){
    $('.update_img').attr('src',
            window.URL.createObjectURL(uploader.files[0]) );
};


$(".agent-contact > li .label").click(function(){
    $(this).parent().toggleClass("show");
});


$(".table-wrapper").on("click", ".remove", function ( event ) {
    var ndx = $(this).parent().index() + 1;
    $("td , th", event.delegateTarget).remove(":nth-child(" + ndx + ")");
});


$(document).on('click', '.close-circle', function () {
    $(this).parent('li').remove()
})


$(document).ready(function() {
    $('*.select2').select2();
});

$('*.select2').one('select2:open', function(e) {
    $('input.select2-search__field').prop('placeholder', 'Search');
    $('input.select2-search__field').focus();
});
