/*=====================
     login js
     ==========================*/
     
     var open = 'fa-eye';
     var close = 'fa-eye-slash';
     var ele = document.getElementById('pwd-input');
     var eleother = document.getElementById('pwd-input2');

     document.getElementById('pwd-icon').onclick = function() {
        if( this.classList.contains(open) ) {
        ele.type="password";
        eleother.type="password";
        this.classList.remove(open);
        this.className += ' '+close;
        } else {
            ele.type="text";
            eleother.type="text";
            this.classList.remove(close);
            this.className += ' '+open;
        }
     }

     document.getElementById('pwd-icon2').onclick = function() {
        if( this.classList.contains(open) ) {
        eleother.type="password";
        ele.type="password";
        this.classList.remove(open);
        this.className += ' '+close;
        } else {
            eleother.type="text";
            ele.type="text";
            this.classList.remove(close);
            this.className += ' '+open;
        }
     }