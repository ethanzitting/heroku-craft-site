const mix = require('laravel-mix');

mix.js('assets/js/main.js', 'web')
    .sass('assets/scss/main.scss', '')
    .copyDirectory('assets/static', 'web')
    .setPublicPath('web')
    .extract([
        'jquery',
        'badger-accordion',
        'slick-carousel',
        'jquery-modal',
        'lazysizes',
    ])
    .sourceMaps()
    .version()
    .disableSuccessNotifications()