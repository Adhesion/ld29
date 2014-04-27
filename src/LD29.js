var jsApp = {
    onload: function() {
        if ( !me.video.init( 'canvas', 800, 600, true ) ) {
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
        // me.game.addHUD( 0, 0, me.video.getWidth(), me.video.getHeight() );
        // me.game.HUD.addItem( "hp", new HPDisplay( 700, 10 ) );
        // Some HUD shit here?

        this.skyScroll = new BackgroundScroll({
            width: 800,
            height: 600,
            image: 'bg_sky',
            speed: 0.08,
            z: 0
        });

        this.wallScroll = new BackgroundScroll({
            width: 800,
            height: 600,
            image: 'bg_wall',
            speed: 0.1,
            z: 1
        });
        this.wordSpawn = new Boss( 800, 600 );

        me.game.world.addChild( this.skyScroll );
        me.game.world.addChild( this.wallScroll );
        me.game.world.addChild( this.wordSpawn );
    },

    onDestroyEvent: function()
    {
        me.audio.stopTrack();
        me.game.world.removeChild( this.scroller );
        me.game.world.removeChild( this.wordSpawn );
    }
});

var Attack = me.ObjectEntity.extend({
    init: function( args ) {
        this.parent( args.x, args.y, {} );
        this.font = new me.BitmapFont("16x16_font", 16);
        this.selectedFont = new me.BitmapFont("16x16_font_blue", 16);
        this.index = args.index;
        this.name = args.name;
        this.text = "" + this.index + " - " + args.name;
        this.action = args.action;
        this.player = args.player;
        this.boss = args.boss;

        this.floating = true;
        this.z = 5;

    },

    update: function(dt) {
        if(this.selected) {
            this.timer += dt;
        }

        if( this.timer > 3000 ) {
            me.game.world.removeChild(this);
        }
    },

    select: function() {
        this.selected = true;
        this.timer = 0;
    },

    onDestroyEvent: function() {
    },

    draw: function(context) {
        this[ this.selected ? 'selectedFont' : 'font' ].draw(
            context,
            this.text,
            this.pos.x,
            this.pos.y
        );
    }
});


/** Words fly towards players and have two fonts that they render. One is used
 * as they fly normally, the other is used as it gets typed out replacing the
 * letters.
 */
var Word = me.ObjectEntity.extend({
    /* Load fonts, etc */
    init: function( args )
    {
        this.parent( args.pos.x, args.pos.y, {} );
        this.font = new me.BitmapFont("16x16_font", 16);
        this.typedFont = new me.BitmapFont("16x16_font_blue", 16);
        this.wordWidth = 0;
        this.spawner = args.spawner;

        this.floating = true; // screen coords
        this.z = 5;

        // Text starts as the full string then gets manipulated into the "typed"
        // string.
        this.fullText = args.text;
        this.untypedText = this.fullText;
        this.typedText = "";
        this.typedOffset = 0;
    },

    /** Handle a letter, check if it is the next one. */
    typeLetter: function( letter )
    {
        if( this.untypedText.charAt( 0 ) == letter ) {
            this.typedText += letter;
            this.untypedText = this.untypedText.substring( 1 );
            this.dirty = true;
        }
        return this.untypedText.length;
    },

    /* Update position, input, etc. */
    update: function( dt )
    {
        // Move to the left...
        this.pos.x -= dt / 6;

        // TODO is this needed ultimately?
        if( this.pos.x + this.wordWidth < 0 ) {
            this.spawner.removeWord( this );
        }
    },

    /* Check if we need to re-calc font-offset and redraw. */
    draw: function( context )
    {
        // Get the full size of the text.
        if( this.wordWidth == 0 ) {
            var metrics = this.font.measureText(context, this.fullText);
            this.wordWidth = metrics.width;
        }

        // If we typed we need the new offset for typed text
        if( this.dirty ) {
            var metrics = this.font.measureText(context, this.typedText);
            this.typedOffset = metrics.width;
            this.dirty = false;
        }

        this.typedFont.draw(
            context,
            this.typedText,
            this.pos.x,
            this.pos.y
        );

        this.font.draw(
            context,
            this.untypedText,
            this.pos.x + this.typedOffset,
            this.pos.y
        );
    }
});

/** Boss spawns words and shit. */
var Boss = me.ObjectEntity.extend({
    init: function( screenWidth, screenHeight ) {
        var settings = {
            image: 'boss1_healthy',
            width: 350,
            height: 350,
            spritewidth: 350,
            spriteheight: 350,
        }
        this.limits = {
            width: screenWidth,
            height: screenHeight - 350,
        };
        this.parent( this.limits.width - 300, 0, settings );

        this.renderable.addAnimation("Floaty", [ 0 ], 100 );
        this.renderable.addAnimation("Talk", [ 2, 0, 2], 100 );
        this.renderable.addAnimation("Blink", [ 1 ], 100 );
        this.setFloatyAnimation();

        this.setAttacking(true); // start off attacking
        this.attackTimer = 0;
        this.attackEnergy = 9; // how many words to send per round
        this.attackDelay = 1000; // how long between words

        this.floating = true; // screen coords
        this.z = 4;

        // Useless thing. remove it.
        this.locationTimer = 0;

        // Turn some text into some arrays.
        var rawPhrases = [
            'I LOVE FLAPPYBIRD',
            'KEEP ON FLAPPIN',
            'FLAPPING HARD',
            'YOUR MOM CANT FLAP',
            'GET ME MORE FLAPPING BIRDS'
        ];

        this.phrases = rawPhrases.map(function( phrase ) {
            return phrase.split( /\s+/ );
        });
        this.startNewPhrase();

        this.activeWords = [];
        this.currentWord = undefined;

        // set up input handling for lower and upper case keys
        for(var c = 65; c <= 90; c++ ) {
            var ch = String.fromCharCode(c);
            me.input.bindKey(me.input.KEY[ch], "type_" + ch);
            me.input.bindKey(me.input.KEY[ch.toLowerCase()], "type_" + ch);
        }
        this.subscription = me.event.subscribe(me.event.KEYDOWN, this.keyDown.bind(this));
    },

    setFloatyAnimation: function() {
        var anim = Math.random() * 10 < 2 ? "Blink" : "Floaty";
        this.renderable.setCurrentAnimation(anim, this.setFloatyAnimation.bind(this) );
    },

    /* Remove given word. */
    removeWord: function( word )
    {
        me.game.world.removeChild( word );

        this.activeWords = this.activeWords.filter( function(e) { return e != word } );

        if( this.currentWord == word ) {
            this.setNextActive();
        }
    },

    /* Update the active word on the screen */
    setNextActive: function() {
        this.currentWord = this.activeWords.shift();
        // TODO slightly hackish...
        if( ! this.attacking && ! this.currentWord ) {
            this.defenseMenu();
        }
    },

    keyDown: function( action ) {
        if( action ) {
            var ch = action.match(/type_(\S)/);
            if( this.currentWord && ch ) {
                var charsLeft = this.currentWord.typeLetter( ch[1] );
                if( charsLeft == 0 ) {
                    this.removeWord( this.currentWord );
                }
            }
        }
    },

    /* Clean up event handler */
    onDestroyEvent: function() {
        me.event.unsubscribe(this.subscription);
        for( var c = 65; c <= 90; c++ ) {
            me.input.unbindKey(me.input.KEY[c]);
        }
    },


    /** Restart the phrase tracking. */
    startNewPhrase: function()
    {
        this.currentPhrase = this.randomPhrase();
        this.currentWordIndex = 0;
    },

    /** Get the next word in the phrase or start a new prhase if we're at the
     * end. */
    nextWord: function()
    {
        if( this.currentPhrase.length < this.currentWordIndex + 1 ) {
            this.startNewPhrase();
        }
        return this.currentPhrase[this.currentWordIndex++];
    },

    /** Return a random phrase. */
    randomPhrase: function()
    {
        return this.phrases[Math.floor(Math.random() * this.phrases.length)];
    },

    /* Move the spawn point, spawn a word. */
    update: function( dt )
    {
        this.parent(dt);
        this.locationTimer += dt;
        this.pos.y = ( 1 + Math.sin( this.locationTimer / 4000 ) )  * this.limits.height / 2;

        if( this.attacking ) {
            this.attackTimer += dt;
            if( this.attackTimer > this.attackDelay ) {
                this.attackTimer = 0;
                this.addWord();
            }
       }
    },

    /** Get the next word from current phrase, add it to screen. */
    addWord: function()
    {
        var spawnPos = new me.Vector2d(this.pos.x, this.pos.y);
        spawnPos.y += 200;
        spawnPos.x += 100;
        // TODO: global tracking
        var word = new Word({
            text: this.nextWord(),
            pos: spawnPos,
            spawner: this,
        });
        if( ! this.currentWord ) {
            this.currentWord = word
        }
        else {
            this.activeWords.push( word );
        }

        this.attackCount++;
        if( this.attackCount > this.attackEnergy ) {
            this.setAttacking(false);
        }
        this.renderable.setCurrentAnimation("Talk", this.setFloatyAnimation.bind(this) );
        me.game.world.addChild(word);
        me.game.world.sort();
    },

    setAttacking: function( attacking ) {
        this.attacking = attacking;
        if( this.attacking){
            this.attackCount = 0;
        }
    },

    defenseMenu: function()
    {
        // TODO invent some mechanics.
        var possibleItems = [
            {
                name: 'LOVING HUG',
                action: function( boss, player ) {
                }
            },
            {
                name: 'LIGHTNING BOLT',
                action: function( boss, player ) {
                }
            },
            {
                name: 'POOPY SMEAR',
                action: function( boss, player ) {
                }
            }
        ];

        this.attacks = []
        for(var i = 1; i <= 3; i++ ) {
            var item = possibleItems[i-1]; // TODO randomize?
            var action = new Attack({
                index: i,
                boss: this,
                name: item.name,
                action: item.action,
                y: i * 32 + 250,
                x: 300
            });
            this.attacks.push(action);
            me.game.world.addChild( action );
        }

        this.attackSub = me.event.subscribe( me.event.KEYDOWN, this.menuInputHandler.bind(this) );

        me.game.world.sort();
    },

    menuInputHandler: function (action, keyCode) {
        for( var i = 0; i < this.attacks.length; i ++) {
            var attack = this.attacks[i];
            if( keyCode === me.input.KEY['NUM'+attack.index]) {
                // TODO perform attack here?
                attack.select();

                // TODO: Delay until after animation completes?
                this.setAttacking(true);

                me.event.unsubscribe(this.attackSub);

                for( var j = 0; j < this.attacks.length; j ++) {
                    // Keep the active one on the screen maybe? Or not
                    if( i != j ) {
                        me.game.world.removeChild( this.attacks[j] );
                    }
                }
            }
        }
    }
});

var BackgroundScroll = me.Renderable.extend({
    init: function( args )
    {
        this.parent( 0, args.width, args.height );
        this.xCounter = 0;

        this.floating = true;
        this.speed = args.speed;
        this.z = args.z;

        if ( !this.backgroundImg )
        {
            this.backgroundImg = me.loader.getImage( args.image );
        }
    },

    draw: function( context )
    {
        // draw 2 backgrounds to scroll properly
        context.drawImage( this.backgroundImg, 0 - this.xCounter, 0 );
        context.drawImage( this.backgroundImg, 0 - this.xCounter + this.backgroundImg.width, 0 );
    },

    updateScroll: function( dt )
    {
        this.xCounter += this.speed * dt;
        if( this.xCounter > this.backgroundImg.width ) {
            this.xCounter = 0;
        }

        me.game.repaint();
    },

    update: function( dt )
    {
        this.updateScroll( dt );
    }
});

var TitleScreen = me.ScreenObject.extend({
    init: function() {
        this.parent( true );
    },

    onResetEvent: function() {
        this.bg = new me.ImageLayer( "title", 800, 600, "title", 1 );
        me.game.world.addChild( this.bg );
        this.hitenter = new HitEnter( 300, 300 );
        me.game.world.addChild( this.hitenter );

        //me.audio.playTrack( "intro" );

        this.subscription = me.event.subscribe( me.event.KEYDOWN, function (action, keyCode, edge) {
            if( keyCode === me.input.KEY.ENTER ) {
                me.state.change( me.state.PLAY);
            }
        });
    },

    onDestroyEvent: function() {
        me.audio.stopTrack();
        me.game.world.removeChild( this.bg );
        me.game.world.removeChild( this.hitenter );
        me.event.unsubscribe( this.subscription );
        //me.audio.play( "ready" );
    }
});

var HitEnter = me.Renderable.extend({
    init: function( x, y ) {
        this.cta = me.loader.getImage("introcta");
        this.parent( new me.Vector2d(x,y), this.cta.width, this.cta.height );
        this.floating = true;
        this.z = 5;
        this.ctaFlicker = 0;
    },

    draw: function(context) {
        this.ctaFlicker++;
        if( this.ctaFlicker > 20 )
        {
            context.drawImage( this.cta, this.pos.x, this.pos.y );
            if( this.ctaFlicker > 40 ) this.ctaFlicker = 0;
        }
    },

    update: function(dt) {
        me.game.repaint();
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
        this.gameover = new me.ImageLayer("gameover", 800, 600, "gameover");
        me.game.world.addChild( this.gameover );

        this.subscription = me.event.subscribe( me.event.KEYDOWN, function (action, keyCode, edge) {
            if( keyCode === me.input.KEY.ENTER ) {
                me.state.change( me.state.INTRO );
            }
        });
    },

    onDestroyEvent: function() {
        me.audio.stopTrack();
        me.game.world.removeChild( this.gameover );
        me.event.unsubscribe( this.subscription );
    }
});

var RadmarsScreen = me.ScreenObject.extend({
    onResetEvent: function() {
        this.radmars = new RadmarsRenderable();
        me.game.world.addChild( this.radmars );

        this.subscription = me.event.subscribe( me.event.KEYDOWN, function (action, keyCode, edge) {
            if( keyCode === me.input.KEY.ENTER ) {
                me.state.change( me.state.MENU );
            }
        });
    },

    onDestroyEvent: function() {
        me.input.unbindKey(me.input.KEY.ENTER);
        me.audio.stopTrack();
        me.game.world.removeChild( this.radmars );
        me.event.unsubscribe( this.subscription );
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
    document.addEventListener('keydown', function(e) {
        if(e.keyCode == 8) {
            e.preventDefault();
        }
    });

    jsApp.onload();
});
