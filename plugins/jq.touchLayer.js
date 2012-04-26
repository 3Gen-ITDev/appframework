//TouchLayer contributed by Carlos Ouro @ Badoo
//handles overlooking js scrolling and native scrolling, panning on titlebar and no delay on click
//It can be used independently in other apps but it is required by jqUi
(function() {
    $.touchLayer = function(el) {
		return new touchLayer(el);
    };
	//configuration stuff
	var inputElements = ['input', 'select', 'textarea'];
	var autoBlurInputTypes = ['button', 'radio', 'checkbox', 'range'];
	var requiresJSFocus = $.os.ios;	//devices which require .focus() on dynamic click events
	var verySensitiveTouch = $.os.blackberry;	//devices which have a very sensitive touch and touchmove is easily fired even on simple taps
	var inputElementRequiresNativeTap = $.os.blackberry || $.os.android;	//devices which require the touchstart event to bleed through in order to actually fire the click on select elements
	var selectElementRequiresNativeTap = $.os.blackberry || $.os.android;	//devices which require the touchstart event to bleed through in order to actually fire the click on select elements
	var focusScrolls = $.os.ios;	//devices scrolling on focus instead of resizing
	var supportsBlurEvent = $.os.ios;	//devices supporting onBlur event
	
    
	//TouchLayer contributed by Carlos Ouro @ Badoo
	//handles overlooking panning on titlebar, bumps on native scrolling and no delay on click
	var touchLayer = function(el) {
        el.addEventListener('touchstart', this, false);
		el.addEventListener('click', this, false);
		this.ignoreNextScroll = true;	//there will be one scroll fired in the load process .hideAddressBar()
		var that = this;
		document.addEventListener('scroll', function(e){
			if(!that.allowDocumentScroll && !that.isPanning && e.target.isSameNode(document)) {
				if(!that.ignoreNextScroll){
					that.ignoreNextScroll = true;
					if(that.wasPanning){
						that.wasPanning = false;
						//give it a couple of seconds
						setTimeout(function(){
							that.hideAddressBar();
						}, 2000);
					} else {
						that.hideAddressBar();
					}
				} else that.ignoreNextScroll=false;
			}
		}, true);
		this.layer=el;
    }
    var prevClickField;
	
    touchLayer.prototype = {
		allowDocumentScroll:false,
        dX: 0,
        dY: 0,
        cX: 0,
        cY: 0,
		layer: null,
		panElementId: "header",
		scrollingEl: null,
		isScrolling: false,
		currentMomentum: 0,
		startTime:0,
		isScrollingVertical: false,
		wasPanning:false,
		isPanning:false,
		ignoreNextScroll:false,
		allowDocumentScroll:false,
		requiresNativeTap: false,
		focusElement: null,
		isFocused:false,
		
        handleEvent: function(e) {
            switch (e.type) {
                case 'touchstart':
                    this.onTouchStart(e);
                    break;
                case 'touchmove':
                    this.onTouchMove(e);
                    break;
                case 'touchend':
                    this.onTouchEnd(e);
                    break;
                case 'click':
                    this.onClick(e);
                    break;
	            case 'blur':
	               	this.onBlur(e);
	                break;
            }
        },
		hideAddressBar:function() {
	        if (jq.os.desktop) {
	            this.layer.style.height="100%";
	        } else if (jq.os.android) {
	            window.scrollTo(1, 1);
	            if (document.documentElement.scrollHeight < window.outerHeight / window.devicePixelRatio)
	                this.layer.style.height = (window.outerHeight / window.devicePixelRatio) + 'px';
	        } 
	        else {
	            document.documentElement.style.height = "5000px";
            
	            window.scrollTo(0, 1);
	            document.documentElement.style.height = window.innerHeight + "px";
	            this.layer.style.height = window.innerHeight + "px";
	        }
	    },
		onClick:function(e){
			//handle forms
			var tag =  e.target && e.target.tagName != undefined ? e.target.tagName.toLowerCase() : '';
            if (inputElements.indexOf(tag)!==-1 && !e.target.isSameNode(document.activeElement)) {
				
				if(supportsBlurEvent){
					var type =  e.target && e.target.type != undefined ? e.target.type.toLowerCase() : '';
					var autoBlur = autoBlurInputTypes.indexOf(type)!==-1;
					
					//remove previous blur event if this keeps focus
					if(this.isFocused && !autoBlur){
						this.focusedElement.removeEventListener('blur', this, false);
					}
					//focus
					if(!autoBlur) {
						e.target.addEventListener('blur', this, false);
						this.isFocused=true;
						this.focusedElement = e.target;
					} else {
						this.isFocused=false;
					}
					this.allowDocumentScroll = true;
				}
				
				//fire focus action
				if(requiresJSFocus){
					e.target.focus();
				}
            }
		},
		onBlur:function(e){
			this.isFocused=false;
			this.focusedElement.removeEventListener('blur', this, false);
			this.focusedElement = null;
			//hideAddressBar now for scrolls, next stack step for resizes
			if(focusScrolls) this.hideAddressBar();
		},
		
		
        onTouchStart: function(e) {
			var id = e.target.id;

            this.dX = e.touches[0].pageX;
            this.dY = e.touches[0].pageY;
			
			this.allowDocumentScroll=false;
			
            this.moved = false;
			this.isPanning = false;
			this.isScrolling = false;
			this.isScrollingVertical = false;
			this.requiresNativeTap = false;
			
			this.checkDOMTree(e.target, this.layer);
			//some stupid phones require a native tap in order for the native input elements to work
			if((inputElementRequiresNativeTap || selectElementRequiresNativeTap) && e.target && e.target.tagName != undefined){
				var tagName = e.target.tagName.toLowerCase();
				 if(inputElementRequiresNativeTap && inputElements.indexOf(tagName)!==-1) this.requiresNativeTap = true;
				 else if(selectElementRequiresNativeTap && tagName=='select') this.requiresNativeTap = true;
			}

			if(!this.isScrolling && !this.isPanning && !this.requiresNativeTap) {
				e.preventDefault();
			} else if(this.isScrollingVertical){
				this.demandVerticalScroll();
			}
			document.addEventListener('touchmove', this, false);
			document.addEventListener('touchend', this, false);
        },
		demandVerticalScroll:function(){
			//if at top or bottom adjust scroll
			var atTop = this.scrollingEl.scrollTop<=0;
			if(atTop){
				this.scrollingEl.scrollTop=1;
			} else {
				var scrollHeight = this.scrollingEl.scrollTop+this.scrollingEl.clientHeight;
				var atBottom = scrollHeight>=this.scrollingEl.scrollHeight;
				if(atBottom) {
					this.scrollingEl.scrollTop=this.scrollingEl.scrollHeight-this.scrollingEl.clientHeight-1;
				}
			}
		},
		//set rules here to ignore scrolling check on these elements
		ignoreScrolling:function(el){
			if(el['scrollWidth']===undefined || el['clientWidth']===undefined) return true;
			if(el['scrollHeight']===undefined || el['clientHeight']===undefined) return true;
			return false;
		},
		
		allowsVerticalScroll:function(el, styles){
			var overflowY = styles.overflowY;
			if(overflowY == 'scroll') return true;
			if(overflowY == 'auto' && el['scrollHeight'] > el['clientHeight'])
				return true;
			return false;
		},
		allowsHorizontalScroll:function(el, styles){
			var overflowX = styles.overflowX;
			if(overflowX == 'scroll') return true;
			if(overflowX == 'auto' && el['scrollWidth'] > el['clientWidth'])
				return true;
			return false;
		},
		
		
		//check if pan or native scroll is possible
		checkDOMTree : function(el, parentTarget){
			
			//check panning
			//temporarily disabled for android - click vs panning issues
			if(!jq.os.android && this.panElementId==el.id){
				this.isPanning = true;
				return;
			}
			//check native scroll
			if($.feat.nativeTouchScroll){
				
				//prevent errors
				if(this.ignoreScrolling(el)) {
					return;
				}
			
				//check 
				var styles = window.getComputedStyle(el);
				if (this.allowsVerticalScroll(el, styles)){
					this.isScrollingVertical=true;
					this.scrollingEl = el;
					this.isScrolling = true;
					return;
				} else if(this.allowsHorizontalScroll(el, styles)){
					this.isScrollingVertical=false;
					this.scrollingEl = null;
					this.isScrolling = true;
				}
				
			}
			//check recursive up to top element
			var isTarget = el.isSameNode(parentTarget);
			if(!isTarget && el.parentNode) this.checkDOMTree(el.parentNode, parentTarget);
		},
		
        
        onTouchMove: function(e) {
			
			this.cY = e.touches[0].pageY - this.dY;
			this.cX = e.touches[0].pageX - this.dX;
			
			if(this.isPanning) {
				this.moved = true;
				document.removeEventListener('touchmove', this, false);
				return;
			}

			if(!this.isScrolling){
				//legacy stuff for old browsers
	            e.preventDefault();
				this.moved = true;
				return;
			}
			
			//otherwise it is a native scroll
			//let's clear events for performance
            document.removeEventListener('touchmove', this, false);
			document.removeEventListener('touchend', this, false);
        },
		
        
        onTouchEnd: function(e) {
			var itMoved = this.moved;
			
			if(verySensitiveTouch){
				itMoved = itMoved && !(Math.abs(this.cX) < 10 && Math.abs(this.cY) < 10);
			}
						
			var that = this;
			
			if(this.isPanning && itMoved){
				//wait 2 secs and cancel
				this.wasPanning = true;
			}
			
            if (!itMoved && !this.requiresNativeTap) {
				
				//NOTE: on android if touchstart is not preventDefault(), click will fire even if touchend is prevented
				//this is one of the reasons why scrolling and panning can not be nice and native like on iPhone
				e.preventDefault();
					
                var theTarget = e.target;
                if (theTarget.nodeType == 3)
                    theTarget = theTarget.parentNode;
				
				//fire the click event
				this.fireEvent('MouseEvents', 'click', theTarget, true, e.mouseToTouch);
            }
			
			this.inFocus = null;
			this.isPanning = false;
			this.isScrolling = false;
            prevClickField = null;
            this.dX = this.cX = this.cY = this.dY = 0;
            document.removeEventListener('touchmove', this, false);
            document.removeEventListener('touchend', this, false);
			
        },
		
		fireEvent:function(eventType, eventName, target, bubbles, mouseToTouch){
			//create the event and set the options
			var theEvent = document.createEvent(eventType);
			theEvent.initEvent(eventName, bubbles, true);
			theEvent.target = target;
			//jq.DesktopBrowsers flag
			if(mouseToTouch) theEvent.mouseToTouch = true;
			target.dispatchEvent(theEvent);
		}
		
    };
	
	//debug
	//touchLayer = $.debug.type(touchLayer, 'touchLayer');
    
    
})();
