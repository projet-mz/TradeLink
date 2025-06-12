(function($) {
    "use strict";
    /*************************
     typed js start
     *************************/
    $(function () {
        $(".typed").typed({
            strings: ["Buy","Sell","Advertise"],
            stringsElement: null,
            typeSpeed: 120,
            backSpeed: 30,
            showCursor: false,
            loop: true,
            cursorChar: "|",
            attr: null,
            contentType: 'html',
            callback: function () {
            },
            preStringTyped: function () {
            },
            onStringTyped: function () {
            },
            resetCallback: function () {
            }
        });
    });
    /*************************
     typed js end
     *************************/
})(jQuery);