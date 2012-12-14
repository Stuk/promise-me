browser.init(desired, function () {
    browser.get('http://admc.io/wd/test-pages/guinea-pig.html', function () {
        browser.title().then(function (title) {
            assert.ok(~title.indexOf('I am a page title - Sauce Labs'), 'Wrong title!');
            return browser.elementById('i am a link');
        }).then(function (el) {
            browser.clickElement(el, function () {
                browser.eval('window.location.href').then(function (location) {
                    assert.ok(~location.indexOf('guinea-pig2'));
                    browser.quit();
                });
            });
        });
    });
});
