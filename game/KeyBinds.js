// Dev
Mousetrap.bind('esc', () => { Game.pauseGame();  }, 'keydown');
Mousetrap.bind('r',   () => { location.reload(); }, 'keydown' );
Mousetrap.bind('q',   () => { Game.getCurrentState().onEnter(); }, 'keydown' );
