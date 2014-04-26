var jsApp = {
    onload: function() {
        if ( !me.video.init( 'canvas', 800, 600, true, 'auto') ) {
            alert( "Sorry, it appears your browser does not support HTML5." );
            return;
        }

        me.audio.init( "m4a,ogg" );

        me.loader.onload = this.loaded.bind( this );
        me.loader.preload( GameResources );

        me.state.change( me.state.LOADING );
    },

    loaded: function() {
        me.state.set( me.state.INTRO, new RadmarsScreen() );
        me.state.set( me.state.MENU, new TitleScreen() );
        me.state.set( me.state.PLAY, new PlayScreen() );
        me.state.set( me.state.GAMEOVER, new GameOverScreen() );

        //me.state.change( me.state.INTRO );
        //me.state.change( me.state.MENU );
        //me.state.change( me.state.GAMEOVER );
        me.state.change( me.state.PLAY );
        //me.debug.renderHitBox = false;

        //me.entityPool.add( "player", Player );
    }
};

var PlayScreen = me.ScreenObject.extend(
{
    init: function()
    {
        this.parent( true );
    },

    // this will be called on state change -> this
    onResetEvent: function()
    {
        //me.game.addHUD( 0, 0, me.video.getWidth(), me.video.getHeight() );
		//me.game.HUD.addItem( "hp", new HPDisplay( 700, 10 ) );
        // Some HUD shit here?

        this.scroller = new BackgroundScroll( 0, 800, 600 );
        me.game.world.addChild( this.scroller );
    },

    onDestroyEvent: function()
    {
        me.audio.stopTrack();
        me.game.world.removeChild( this.scroller );
    }
});

var BackgroundScroll = me.Renderable.extend({
    init: function( pos, width, height )
    {
        this.parent( pos, width, height );
        this.xCounter = 0;

        this.floating = true;

        if ( !this.backgroundImg )
        {
            this.backgroundImg = me.loader.getImage( "title_bg" );
        }
    },

    draw: function( context )
    {
        // draw 2 backgrounds to scroll properly
        context.drawImage( this.backgroundImg, 0 - this.xCounter, 0 );
        context.drawImage( this.backgroundImg, 0 - this.xCounter + 1200, 0 );
    },

    updateScroll: function()
    {
        this.xCounter++;
        if( this.xCounter > 1200 ) {
            this.xCounter = 0;
        }

        me.game.repaint();
    },

    update: function( dt )
    {
        this.updateScroll();
    }
});

var TitleScreen = me.ScreenObject.extend({
    init: function() {
        this.parent( true );
        this.ctaFlicker = 0; 
    },

    onResetEvent: function() {
        if( ! this.cta ) {
            this.background= me.loader.getImage("intro");
            this.cta = me.loader.getImage("introcta");
        }

        me.input.bindKey( me.input.KEY.ENTER, "enter", true );
        //me.audio.playTrack( "intro" );
    },

    update: function() {
        if( me.input.isKeyPressed('enter')) {
            me.state.change(me.state.PLAY);
        }

        // have to force redraw :(
        me.game.repaint();
    },

    draw: function(context) {
        context.drawImage( this.background, 0, 0 );
        this.ctaFlicker++;
		if( this.ctaFlicker > 20 ) 
		{
            context.drawImage( this.cta, 74*4, 138*4 );
			if( this.ctaFlicker > 40 ) this.ctaFlicker = 0;  
		}
    },

    onDestroyEvent: function() {
        me.input.unbindKey(me.input.KEY.ENTER);
        me.audio.stopTrack();
        //me.audio.play( "ready" );
    }
});


var GameOverScreen = me.ScreenObject.extend(
{
    init: function()
    {
        // disable HUD here?
        this.parent( true );
        this.font = new me.BitmapFont("32x32_font", 32);
        this.font.set( "left" );
    },
    
    onResetEvent: function()
    {
        me.input.bindKey( me.input.KEY.ENTER, "enter", true );
        if ( !this.background )
        {
            if( me.game.goodEnding )
            {
                this.background = me.loader.getImage( "gameover_good" );
                me.audio.stopTrack();
                me.audio.playTrack( "intro" );
            }
            else
            {
                this.background = me.loader.getImage( "gameover" );
                me.audio.stopTrack();
                me.audio.play( "badend" );
            }
        }
    },

    update: function()
    {
        if( me.input.isKeyPressed('enter')) {
            me.audio.stopTrack();
            me.state.change(me.state.INTRO);
        }

        return this.parent();
    },
    
    draw: function( context, x, y )
    {
        context.drawImage( this.background, 0, 0 );
    }
});

var RadmarsScreen = me.ScreenObject.extend({
    onResetEvent: function() {
        this.radmars = new RadmarsRenderable();
        me.game.world.addChild( this.radmars );
    },

    onDestroyEvent: function() {
        me.input.unbindKey(me.input.KEY.ENTER);
        me.audio.stopTrack();
        me.game.world.removeChild( this.radmars );
    }
});

var RadmarsRenderable = me.Renderable.extend({
    init: function() {
        this.parent( 0, 800, 600 );
        this.counter = 0;

        this.floating = true;

        if( !this.title ) {
            this.bg= me.loader.getImage("intro_bg");
            this.glasses1 = me.loader.getImage("intro_glasses1"); // 249 229
            this.glasses2 = me.loader.getImage("intro_glasses2"); // 249 229
            this.glasses3 = me.loader.getImage("intro_glasses3"); // 249 229
            this.glasses4 = me.loader.getImage("intro_glasses4"); // 249 229
            this.text_mars = me.loader.getImage("intro_mars"); // 266 317
            this.text_radmars1 = me.loader.getImage("intro_radmars1"); // 224 317
            this.text_radmars2 = me.loader.getImage("intro_radmars2");
        }

        me.input.bindKey( me.input.KEY.ENTER, "enter", true );
        me.audio.playTrack( "radmarslogo" );
    },

    draw: function(context) {
        context.drawImage( this.bg, 0, 0 );
        if( this.counter < 130) context.drawImage( this.text_mars, 266+80, 317+60 );
        else if( this.counter < 135) context.drawImage( this.text_radmars2, 224+80, 317+60 );
        else if( this.counter < 140) context.drawImage( this.text_radmars1, 224+80, 317+60 );
        else if( this.counter < 145) context.drawImage( this.text_radmars2, 224+80, 317+60 );
        else if( this.counter < 150) context.drawImage( this.text_radmars1, 224+80, 317+60 );
        else if( this.counter < 155) context.drawImage( this.text_radmars2, 224+80, 317+60 );
        else if( this.counter < 160) context.drawImage( this.text_radmars1, 224+80, 317+60 );
        else if( this.counter < 165) context.drawImage( this.text_radmars2, 224+80, 317+60 );
        else context.drawImage( this.text_radmars1, 224+80, 317+60 );

        if( this.counter < 100) context.drawImage( this.glasses1, 249+80, 229*(this.counter/100)+60 );
        else if( this.counter < 105) context.drawImage( this.glasses2, 249+80, 229+60 );
        else if( this.counter < 110) context.drawImage( this.glasses3, 249+80, 229+60 );
        else if( this.counter < 115) context.drawImage( this.glasses4, 249+80, 229+60 );
        else context.drawImage( this.glasses1, 249+80, 229+60 );
    },

    update: function( dt ) {
        if( me.input.isKeyPressed('enter')) {
            me.state.change(me.state.MENU);
        }
        if ( this.counter < 350 ) {
            this.counter++;
        }
        else{
            me.state.change(me.state.MENU);
        }
        // have to force redraw :(
        me.game.repaint();
    }
});

window.onReady( function() {
    jsApp.onload();
});
