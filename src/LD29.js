var screenHeight = 600;
var screenWidth = 800;

var bossData = [
    {
        bossID: 1,
        mouthOffsetX: 100,
        mouthOffsetY: 200,
        phases: 3,
        rawPhrases: [
            'I AM BOSS ONE',
        ],
        title: [
           'Mysterious Boy:', 
			'Robo-sempai, You just transferred to this highschool,', 
			'but there is something i must confess to you!',
			
			'Robotic Schoolgirl:' ,
			'Wait, Who are you again?',
			' ',
			
			'Mysterious Boy:', 
			'I’m your classmate, Luke Lampered!', 
			'Please, may I speak with you in the hallway?'
        ],
    },
    {
        bossID: 2,
        mouthOffsetX: 90,
        mouthOffsetY: 160,
        phases: 3,
        rawPhrases: [
            'I LOVE FLAPPYBIRD',
            'KEEP ON FLAPPIN',
            'FLAPPING HARD',
            'YOUR MOM CANT FLAP',
            'GET ME MORE FLAPPING BIRDS',
        ],
        title: [
			'Bazooka-sensei:', 
			'Robo-chan~ how are yo-',
			'What! You’ve killed a fellow student!',
			
			'Robotic Schoolgirl:', 
			'Wait!', 
			'I can explain!',
			
			'Bazooka-sensei:', 
			'Hallway, now!',
			''
        ],
    },
    {
        bossID: 3,
        mouthOffsetX: 90,
        mouthOffsetY: 160,
        phases: 1,
        rawPhrases: [
            'I LOVE FLAPPYBIRD',
            'KEEP ON FLAPPIN',
            'FLAPPING HARD',
            'YOUR MOM CANT FLAP',
            'GET ME MORE FLAPPING BIRDS',
        ],
        title: [
			'Mysterious Robotic Schoolgirl:', 
			'Im you from the future.', 
			'Something terrible will happen very soon.', 
			
			'Robotic Schoolgirl:', 
			'What the shit?', 
			'',
			
			'Mysterious Robotic Schoolgirl:', 
			'I’ll explain the details in the hallway.', 
			'Quickly, there isn\'t much time.' 
        ],
    }

];

var nextBoss = 0;

var jsApp = {
    onload: function() {
        if ( !me.video.init( 'canvas', screenWidth, screenHeight, true ) ) {
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
        me.state.set( me.state.SETTINGS , new LevelScreen() ); // TODO: Can we have custom state names????
        me.state.set( me.state.PLAY, new PlayScreen() );
        me.state.set( me.state.GAMEOVER, new GameOverScreen() );

        me.state.change( me.state.INTRO );
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
        this.skyScroll = new BackgroundScroll({
            width: screenHeight,
            height: screenWidth,
            image: 'bg_sky',
            speed: 0.08,
            z: 0,
            yOffset: 70,
        });

        this.wallScroll = new BackgroundScroll({
            width: screenHeight,
            height: screenWidth,
            image: 'bg_wall',
            speed: 0.1,
            z: .5,
        });

        this.player = new Player( screenWidth );
        var bd = bossData[nextBoss];
        this.boss = new Boss({
            bossID: bd.bossID,
            phases: bd.phases,
            rawPhrases: bd.rawPhrases,
            mouthOffsetX: bd.mouthOffsetX,
            mouthOffsetY: bd.mouthOffsetY,
            player: this.player,
        });

        this.playerHP = new HPBar({
            obj: this.player,
            image: "player",
        });
        this.bossHP = new HPBar({
            obj: this.boss,
            image: "boss",
        });


        me.game.world.addChild( this.skyScroll );
        me.game.world.addChild( this.wallScroll );
        me.game.world.addChild( this.boss );
        me.game.world.addChild( this.player );
        me.game.world.addChild( this.playerHP );
        me.game.world.addChild( this.bossHP );
    },

    onDestroyEvent: function()
    {
        me.audio.stopTrack();
        me.game.world.removeChild( this.wallScroll);
        me.game.world.removeChild( this.skyScroll);
        me.game.world.removeChild( this.player);
        me.game.world.removeChild( this.playerHP);
        me.game.world.removeChild( this.bossHP);
        me.game.world.removeChild( this.boss );
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

    select: function(boss, player) {
        this.selected = true;
        player.startAttackAnimation( (function() {
            this.action( this.boss, this.player );

            // boss starts attacking after action is taken
            this.boss.setAttacking( true );
        }).bind(this));
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
        this.wordSpeed = args.speed;
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
        var s = this.wordSpeed;
        var p = this.spawner.player;
        var dir = p.anchorPoint.clone();
        dir.scale(p.width, p.height);
        dir.add(p.pos);
        dir.sub(this.pos);
        var distance = dir.length();
        dir.normalize();
        dir.scale( s, s );

        this.pos.add( dir );

        // TODO is this needed ultimately?
        if( distance < 20 ) {
            this.spawner.removeWord( this, false );
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

var WordChunk = me.ObjectEntity.extend({
    init: function( pos )
    {
        var settings = {
            image: 'wordchunk' + (Math.floor(Math.random() * 5) + 1),
            width: 10,
            height: 10,
            spritewidth: 10,
            spriteheight: 10,
        }
        this.parent( pos.x, pos.y, settings );

        this.floating = true; // screen coords
        this.z = 4;

        this.timer = 0;
        var direction = Math.random() * 2 * Math.PI;
        this.vel = new me.Vector2d( Math.cos( direction ), Math.sin( direction ) );
        this.vel.scale(2, 2); // speedish.
    },

    update: function( dt ) {
        this.pos.add(this.vel);
        this.vel.y += .05;
        this.timer += dt;
        if(this.timer > 1000) {
            me.game.world.removeChild(this);
        }
    },
});

var Boom = me.ObjectEntity.extend({
    init: function( pos, img )
    {
        var settings = {
            image: img,
            width: 100,
            height: 100,
            spritewidth: 100,
            spriteheight: 100,
        }
        this.parent( pos.x - 50, pos.y - 50, settings );

        this.renderable.addAnimation("Floaty", [ 0, 1, 2, 3 ], 70 );
        this.renderable.setCurrentAnimation("Floaty", (function() {
            me.game.world.removeChild( this );
        }).bind(this));

        this.floating = true; // screen coords
        this.z = 3;
    },
});

var Beam = me.ObjectEntity.extend({
    init: function( pos )
    {
        var settings = {
            image: 'beam',
            width: 700,
            height: 126,
            spritewidth: 700,
            spriteheight: 105,
        }
        this.trackingPos = pos;
        this.parent( pos.x, pos.y, settings );

        this.renderable.addAnimation("Floaty", [ 0, 1, 2, 3, 4, 5], 70 );
        this.renderable.setCurrentAnimation("Floaty", (function() {
            me.game.world.removeChild( this );
        }).bind(this));

        this.floating = true; // screen coords
        this.z = 3;
    },
    update: function(dt) {
        this.parent(dt)
        this.pos.x = this.trackingPos.x + 90;
        this.pos.y = this.trackingPos.y + 25;
    },

});

var Player = me.ObjectEntity.extend({
    init: function( screenHeight ) {
        var settings = {
            image: 'player',
            width: 150,
            height: 150,
            spritewidth: 150,
            spriteheight: 150,
        }
        this.limits = {
            top: 100,
            bottom: 350,
        };
        this.parent( 10, 0, settings );

        this.floating = true; // screen coords
        this.z = 2;

        this.hp = 100;

        this.renderable.addAnimation("Floaty", [ 0,1,2,3 ], 100 );
        this.renderable.addAnimation("Damage", [ 4 ], 100 );
        this.renderable.addAnimation("Powerup", [ 5, 6 ], 100 );
        this.renderable.addAnimation("Attack", [ 7, 8 ], 100 );

        this.renderable.setCurrentAnimation( "Floaty" );

        this.locationTimer = 0;
    },

    hit: function() {
        this.renderable.setCurrentAnimation("Damage", "Floaty");
        this.hp -= 10;
        if( this.hp <= 0 ) {
            // TODO Game reset logic!
            nextBoss = 0;
            me.state.change( me.state.GAMEOVER );
        }
    },

    startAttackAnimation: function( effect ) {
        var powerupFrames = 1;
        var attackFrames = 5;
        var animCallback;
        animCallback = (function() {
            if(powerupFrames > 0 ) {
                powerupFrames --;
                this.renderable.setCurrentAnimation("Powerup", animCallback);
            }
            else if( attackFrames > 0 ) {
                attackFrames--;
                this.renderable.setCurrentAnimation("Attack", animCallback);
                me.game.world.addChild(new Beam(this.pos));
            }
            else {
                this.renderable.setCurrentAnimation("Floaty");
                // Run the attack effect at the end.
                effect();
            }
        }).bind(this);

        this.renderable.setCurrentAnimation( "Powerup", animCallback );
    },

    update: function( dt )
    {
        this.parent(dt);
        this.locationTimer += dt;
        var progress = ( 1 + Math.sin( this.locationTimer / 4000 ) );
        var range = (this.limits.bottom - this.limits.top) / 2
        this.pos.y = progress * range + this.limits.top;
    }
});

var HPBar = me.Renderable.extend({
    init: function( args ) {
        this.fromLeft = args.image == "player";
        this.parent( new me.Vector2d( this.fromLeft ? 11 : screenWidth - 300, screenHeight - 100), 289, 78 );
        this.obj = args.obj;
        this.back  = me.loader.getImage( args.image + "_hp_back" );
        this.bar   = me.loader.getImage( args.image + "_hp_bar" );
        this.front = me.loader.getImage( args.image + "_hp_front" );

        this.floating = true; // screen coords
        this.z = 1;
        this.hp = 0;
        this.barWidth = 1;
        this.barHeight = 38;
    },

    update: function() {
        if( this.hp != this.obj.hp ) {
            this.hp = this.obj.hp;
            this.barWidth = this.hp / 100 * 231;
            if( this.barWidth <= 0 ) {
                this.barWidth = 1;
            }
        }
    },

    draw: function( context ) {
        context.drawImage( this.back, this.pos.x, this.pos.y );
        context.drawImage(
            this.bar,
            0, 0, // sx, sy
            this.barWidth, this.barHeight, // sw, sh
            this.pos.x + ( this.fromLeft ? 47 : 243 - this.barWidth ), this.pos.y + 17, // dx, dy
            this.barWidth, this.barHeight // dw, dh
        );
        context.drawImage( this.front, this.pos.x, this.pos.y );
    }
});

/** Boss spawns words and shit. */
var Boss = me.ObjectEntity.extend({
    init: function( args) {
        this.hp = 100;
        this.phases = args.phases;
        this.baseImage = "boss" + args.bossID;
        this.currentImage = this.getBossImageName();
        var settings = {
            image: this.currentImage,
            width: 350,
            height: 350,
            spritewidth: 350,
            spriteheight: 350,
        }
        this.mouthOffsetX = args.mouthOffsetX;
        this.mouthOffsetY = args.mouthOffsetY;
        this.limits = {
            top: 100,
            bottom: 170,
        };
        this.parent( screenWidth - 300, this.limits.top, settings );
        this.player = args.player;

        this.renderable.addAnimation("Floaty", [ 0 ], 100 );
        this.renderable.addAnimation("Talk", [ 2, 0, 2], 100 );
        this.renderable.addAnimation("Blink", [ 1 ], 100 );
        this.setFloatyAnimation();


        this.setAttacking(true); // start off attacking
        this.attackTimer = 0;
        this.attackEnergy = 1; // how many words to send per round
        this.attackDelay = 1000; // how long between words

        this.floating = true; // screen coords
        this.z = 2;

        // Useless thing. remove it.
        this.locationTimer = 0;

        // Turn some text into some arrays.
        var rawPhrases = args.rawPhrases;

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

    getBossImageName: function() {
        var divisions = 100 / this.phases;
        for( var d = 0; d < this.phases; d++ ) {
            if( this.hp <= divisions * (1+d) ) {
                return this.baseImage + "_" + (this.phases - d);
            }
        }
        return this.baseImage + "_" + d;
    },

    draw: function( context ) {
        this.parent( context );
    },

    randomPos: function() {
        var v = this.pos.clone();
        v.x += Math.random() * (this.width - 130) + 60;
        v.y += Math.random() * (this.height - 80) + 60;
        return v;
    },

    hit: function( dmg )
    {
        this.hp -= dmg;
        var currentImage = this.renderable.image;
        this.renderable.image = me.loader.getImage(this.getBossImageName());

        for( var i = 0; i < 5; i ++ ) {
            window.setTimeout( (function() {
                me.game.world.addChild(new Boom( this.randomPos(), 'explode' ));
            }).bind(this), Math.random() * 250 );
        }

        if( currentImage != this.renderable.image ) {
            for( var i = 0; i < 5; i ++ ) {
                window.setTimeout( (function() {
                    me.game.world.addChild(new Boom( this.randomPos(), 'explode' ));
                }).bind(this), Math.random() * 250 );
            }
        }

        if( this.hp <= 0 ) {
            window.setTimeout( function() {
                nextBoss++;
                if( bossData[nextBoss] ) {
                    me.state.change( me.state.SETTINGS);
                }
                else {
                    // TODO Game reset logic!
                    nextBoss = 0;
                    me.state.change( me.state.GAME_OVER);
                }
            }, 1000);
        }
    },

    setFloatyAnimation: function() {
        var anim = Math.random() * 10 < 2 ? "Blink" : "Floaty";
        this.renderable.setCurrentAnimation(anim, this.setFloatyAnimation.bind(this) );
    },

    /* Remove given word. */
    removeWord: function( word, completed )
    {
        if( ! completed ) {
            this.player.hit();
        }

        for( var i = 0; i < Math.random() * 8 + word.typedText.length; i++ ) {
            me.game.world.addChild(new WordChunk( word.pos ));
        }
        me.game.world.addChild(new Boom( word.pos, completed ? 'shockwave' : 'explode' ));
        me.game.world.sort();

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

    keyDown: function( action )
    {
        if( action ) {
            var ch = action.match(/type_(\S)/);
            if( this.currentWord && ch ) {
                var charsLeft = this.currentWord.typeLetter( ch[1] );
                if( charsLeft == 0 ) {
                    this.removeWord( this.currentWord, true );
                }
            }
        }
    },

    /* Clean up event handler */
    onDestroyEvent: function()
    {
        me.event.unsubscribe(this.subscription);

        if( this.attackSub ) {
            me.event.unsubscribe(this.attackSub);
        }

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
        var progress = ( 1 + Math.sin( this.locationTimer / 4000 ) );
        var range = (this.limits.bottom - this.limits.top) / 2
        this.pos.y = progress * range + this.limits.top;

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
        spawnPos.y += this.mouthOffsetY; 200;
        spawnPos.x += this.mouthOffsetX; 100;
        // TODO: global tracking
        var word = new Word({
            text: this.nextWord(),
            pos: spawnPos,
            spawner: this,
            speed: 1.833,
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
                    boss.hit( 33 );
                }
            },
            {
                name: 'LIGHTNING BOLT',
                action: function( boss, player ) {
                    boss.hit( 100 );
                }
            },
            {
                name: 'POOPY SMEAR',
                action: function( boss, player ) {
                    player.hit();
                }
            }
        ];

        this.attacks = []
        for(var i = 1; i <= 3; i++ ) {
            var item = possibleItems[i-1]; // TODO randomize?
            var action = new Attack({
                index: i,
                boss: this,
                player: this.player,
                name: item.name,
                action: item.action,
                y: i * 32 + 250,
                x: 250
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
                attack.select( this, this.player );

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
        this.yOffset = args.yOffset || 0;
        this.backgroundImg = me.loader.getImage( args.image );
    },

    draw: function( context )
    {
        // draw 2 backgrounds to scroll properly
        context.drawImage( this.backgroundImg, 0 - this.xCounter, this.yOffset );
        context.drawImage( this.backgroundImg, 0 - this.xCounter + this.backgroundImg.width, this.yOffset );
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
        this.bg = new me.ImageLayer( "title", screenWidth, screenHeight, "title", 1 );
        me.game.world.addChild( this.bg );
        this.hitenter = new HitEnter( 300, 300 );
        me.game.world.addChild( this.hitenter );

        //me.audio.playTrack( "intro" );

        this.subscription = me.event.subscribe( me.event.KEYDOWN, function (action, keyCode, edge) {
            if( keyCode === me.input.KEY.ENTER ) {
                me.state.change( me.state.SETTINGS);
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

var LevelScreen = me.ScreenObject.extend(
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
        this.gameover = new me.ImageLayer("bg", screenWidth, screenHeight, "talkscene_bg");
        this.gameover.z = 0;

        this.bossPortrait = new me.ObjectEntity( 500, 100, {
            image: 'boss' + bossData[nextBoss].bossID + '_1',
            width: 350,
            height: 350,
            spritewidth: 350,
            spriteheight: 350,
        });
        this.bossPortrait.renderable.animationpause = true;

        this.bossPortrait.floating = true; // screen coords
        this.bossPortrait.z = 4;

        this.playerPortrait = new me.ObjectEntity( -10, 100, {
            image: 'boss3_1',
            width: 350,
            height: 350,
            spritewidth: 350,
            spriteheight: 350,
        });
        this.playerPortrait.renderable.animationpause = true;

        this.playerPortrait.floating = true; // screen coords
        this.playerPortrait.z = 4;
        this.playerPortrait.renderable.flipX( true );

        this.textArea = new me.ObjectEntity( 170, 400, {
            image: 'answer_box',
            width: 497,
            height: 121,
        });

        this.textArea.floating = true; // screen coords
        this.textArea.z = 5;

        this.levelText = new TitleText({
            pos: new me.Vector2d( 180, 420 ),
            text: bossData[nextBoss].title,
        });

        me.game.world.addChild( this.playerPortrait );
        me.game.world.addChild( this.bossPortrait );
        me.game.world.addChild( this.gameover );
        me.game.world.addChild( this.textArea );
        me.game.world.addChild( this.levelText );

        this.subscription = me.event.subscribe( me.event.KEYDOWN, (function (action, keyCode, edge) {
            if( keyCode === me.input.KEY.ENTER ) {
                if( !this.levelText.nextLine() ) {
                    me.state.change( me.state.PLAY);
                }
            }
        }).bind(this));
    },

    onDestroyEvent: function() {
        me.audio.stopTrack();
        me.game.world.removeChild( this.gameover );
        me.game.world.removeChild( this.bossPortrait );
        me.event.unsubscribe( this.subscription );
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
        this.gameover = new me.ImageLayer("gameover", screenWidth, screenHeight, "gameover");
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
        this.parent( 0, screenHeight, screenWidth );
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

var TitleText = me.ObjectEntity.extend({
    /* Load fonts, etc */
    init: function( args )
    {
        this.parent( args.pos.x, args.pos.y, {} );
        this.font = new me.BitmapFont("16x16_font", 16);
        this.floating = true; // screen coords
        this.z = 7;

        this.fullText = args.text;
        this.line = 0;
    },

    nextLine: function() {
        if( this.line >= this.fullText.length ) {
            return false;
        }
        this.line += 3;
        return true;
    },

    draw: function( context )
    {
        for(var i = 0; i < 3; i ++ ) {
            if( this.fullText[this.line + i] ) {
                this.font.draw(
                    context,
                    this.fullText[this.line + i],
                    this.pos.x,
                    this.pos.y + i * 20
                );
            }
        }
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
