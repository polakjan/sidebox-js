function sidebox(params) {
    this.init(params);
}
sidebox.instances = [];

(function(p, me) { for(var m in me) { p[m] = me[m]; }})(sidebox.prototype, {

    init: function(params) {
        var t = this;
        sidebox.instances.push(t);

        // default values
        t.box = null;
        t.box_html = `<div class="sidebox__box">
            <div class="sidebox__buffer"></div>
            <div class="sidebox__top">
                <div class="sidebox__count"></div>
                <div class="sidebox__close"></div>
            </div>
            <div class="sidebox__content"></div>
            <div class="sidebox__bottom">
                <div class="sidebox__prev"></div>
                <div class="sidebox__thumbs"></div>
                <div class="sidebox__magnify"></div>
                <div class="sidebox__next"></div>
            </div>
        </div>`;
        t.opening = false;
        t.opened = false;
        t.loading_url = null;
        t.img = null;
        t.content_width = null;
        t.content_height = null;
        t.magnified = false;
        t.dragging = false;
        t.container = null;
        t.items = [];
        t.index = 0;

        // update from params
        for (var p in params) {
            t[p] = params[p];
        }

        t.initLinks();
        t.initImages();

        t.createBox();
    },

    initLinks: function() {
        if (this.container) {
            var t = this,
                as = t.container.getElementsByClassName('sidebox_link');
            for (var i = 0; i < as.length; i++) {
                t.items.push({
                    url: as[i].href,
                    caption: as[i].getAttribute('data-caption')
                });
                as[i].addEventListener('click', (function() {
                    var index = t.items.length - 1;
                    return function(ev) {
                        ev.preventDefault();
                        t.openIndex(index);
                    };
                })());
            }
        }
    },

    initImages: function() {
        if (this.container) {
            var t = this,
                is = t.container.getElementsByClassName('sidebox_image');
            for (var i = 0; i < is.length; i++) {
                t.items.push({
                    url: is[i].src,
                    caption: is[i].getAttribute('data-caption')
                });
                is[i].addEventListener('click', (function() {
                    var index = t.items.length - 1;
                    return function(ev) {
                        ev.preventDefault();
                        t.openIndex(index);
                    };
                })());
            }
        }
    },

    open: function(url) {
        var t = this;
        if (!t.opened) {

            for (var i in sidebox.instances) {
                if(sidebox.instances[i].opened) {
                    sidebox.instances[i].close();
                }
            }

            t.width(50);
            t.opened = true;
        }

        t.opening = true;
        setTimeout(function() {
            t.opening = false;
        }, 100);

        var qm = url.indexOf('?'),
            part = url;
        if (-1 !== qm) {
            part = url.substr(0, qm);
        }

        if (part.match(/(jpg|jpeg|png|gif)$/i)) {
            t.image(url);   
        } else {
            t.url(url);
        }
    },

    openIndex: function(i) {
        this.index = i;
        this.open(this.items[i].url);

        this.part('count').innerHTML = (i+1)+'/'+this.items.length;
    },

    previous: function() {
        this.openIndex(this.index ? this.index-1 : this.items.length - 1);
    },

    next: function() {
        this.openIndex(this.index >= this.items.length - 1 ? 0 : this.index+1);
    },

    close: function() {
        this.width(0);
        this.opened = false;
    },

    display: function() {
        this.fitContent();
        
        this.useBuffer();
    },

    toggleMagnify: function() {
        if (this.box.classList.contains('magnified')) {
            this.unmagnify();
        } else {
            this.magnify();
        }
    },

    magnify: function() {
        this.magnified = true;

        this.box.classList.add('magnified');

        this.widthPx(Math.min(window.innerWidth, this.content_width));
    },

    unmagnify: function() {
        if (this.magnified) {
            if (this.img) {
                this.img.style.left = '0px';
                this.img.style.top = '0px';
            }

            this.magnified = false;

            this.box.classList.remove('magnified');

            this.fitContent();
        }
    },

    width: function(vw) {
        this.box.style.width = vw+'vw';
    },

    widthPx: function(px) {
        this.width((px * 100) / window.innerWidth);
    },

    setBuffer: function(content) {
        this.empty(this.buffer);
        this.buffer.appendChild(content);
    },

    useBuffer: function() {
        if (this.buffer.firstChild) {
            this.empty(this.content);
            while(this.buffer.firstChild) { 
                this.content.appendChild(this.buffer.firstChild);
            }
        }
    },

    image: function(url) {
        var t = this,
            img = this.html2el('<img src="'+url+'"/>');
        t.img = img;

        ['mousedown', 'touchstart'].forEach(function(ev) {
            img.addEventListener(ev, function(e) { t.startDrag(e); });
        });
        ['mousemove', 'touchmove'].forEach(function(ev) {
            img.addEventListener(ev, function(e) { t.drag(e); });
        });
            
        t.loading_url = url;
        if (!img.complete) {
            img.addEventListener('load', function() { t.imageLoaded(img); });
            img.addEventListener('error', function() { t.error('Failed loading image'); })
        }

        t.setBuffer(img);

        if (img.complete) {
            t.imageLoaded(img);
        }
    },

    url: function(url) {

    },

    error: function(message) {
        return this.html2el('<div class="sidebox__error">'+message+'</div>');
    },

    /**
     * move a loaded image from buffer to content
     */
    imageLoaded: function(img) {
        if (img.src != this.loading_url) { return; }

        this.unmagnify();

        this.content_width = img.naturalWidth;
        this.content_height = img.naturalHeight;

        this.display();
    },

    /**
     * resizes the box to fit content of the specified size
     */
    fitContent: function() {
        var t = this, 
            cw = window.innerWidth, 
            ch = t.content.clientHeight,
            w = t.content_width, 
            h = t.content_height,
            r = (w / h); // ratio

        if (r * ch > cw) { // if calculating by height would produce larger width than viewport
            this.widthPx(Math.min(cw, w)); // Math.min(cw, w) means no upscaling
            
        } else {
            this.widthPx(Math.min(r * ch, w)); // Math.min(r * ch, w) means no upscaling
        }

        if (cw < w || ch < h) {
            t.box.classList.add('magnifiable');
        } else {
            t.box.classList.remove('magnifiable');
        }
        // t.part('magnify').style.visibility = (cw < w || ch < h ? 'visible' : 'hidden');
    },

    createBox: function() {
        var t = this;
        t.box = t.html2el(t.box_html);
        t.buffer = t.part('buffer');
        t.content = t.part('content');
        t.part('close').addEventListener('click', function() { t.close() });
        t.part('prev').addEventListener('click', function() { t.previous() });
        t.part('next').addEventListener('click', function() { t.next() });
        t.part('thumbs').addEventListener('click', function() { t.thumbs() });
        t.part('magnify').addEventListener('click', function() { t.toggleMagnify() });
        document.body.appendChild(t.box);

        if (t.items.length > 1) {
            t.box.classList.add('multiple');
        }

        ['mouseup', 'touchend'].forEach(function(ev) {
            window.addEventListener(ev, function(e) { t.stopDrag(e); });
        });

        window.addEventListener('click', function(e) { 
            if (t.opened && !t.opening) {
                var p = e.target.parentElement;
                while (p) {
                    if (p.classList.contains('sidebox__box')) {
                        return true;
                    }
                    p = p.parentElement;
                }
                t.close();
            }
        });
    },

    startDrag: function(ev) {
        ev.preventDefault();

        if (!this.magnified) { return false; }

        var img = ev.target;

        img.style.position = 'relative';
        if (!img.style.left) {
            img.style.left = 0;
        }
        if (!img.style.top) {
            img.style.top = 0;
        }

        this.dragging = {
            x: ev.clientX,
            y: ev.clientY,
            l: parseInt(img.style.left),
            t: parseInt(img.style.top),
        };
    },

    stopDrag: function(ev) {
        if (this.dragging) {
            this.dragging = false;
        }
    },

    drag: function(ev) {
        if (!this.dragging) { return false; }

        var img = ev.target;

        img.style.left = this.dragging.l + (ev.clientX - this.dragging.x) + 'px';
        img.style.top = this.dragging.t + (ev.clientY - this.dragging.y) + 'px';
    },

    html2el: function(html) {
        var d = document.createElement('div');
        d.innerHTML = html;
        return d.firstChild;
    },

    empty: function(e) {
        while(e.firstChild) { 
            e.removeChild(e.firstChild); 
        }
    },

    // getfirstdescendantbyclass
    gfdbc: function(e, c) {
        var d = e.getElementsByClassName(c);
        return d ? d[0] : null;
    },

    part: function(c) {
        return this.gfdbc(this.box, 'sidebox__'+c);
    }
});
