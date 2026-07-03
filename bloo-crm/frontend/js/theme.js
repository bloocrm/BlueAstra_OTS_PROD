/*
  Copyright (c) 2026 Blue Astra Technologies LLP, India. All Rights Reserved.
  Application-wide theme switcher (Red / Royal Blue / Black & Yellow).
*/
(function () {
    var VALID = ['red', 'blue'];
    function current() {
        var t = localStorage.getItem('crmTheme');
        return VALID.indexOf(t) !== -1 ? t : 'red';
    }
    function apply(t) {
        if (VALID.indexOf(t) === -1) t = 'red';
        document.body.setAttribute('data-theme', t);
        localStorage.setItem('crmTheme', t);
        ['themePicker', 'themePickerLogin'].forEach(function (id) {
            var sel = document.getElementById(id);
            if (sel && sel.value !== t) sel.value = t;
        });
    }
    // Expose globally
    window.setCrmTheme = apply;
    window.getCrmTheme = current;
    // Under the Sky theme, chart "red" segments become orange
    window.chartRed = function () { return current() === 'blue' ? '#FB8C00' : '#e74c3c'; };
    window.skyFix = function (c) { return (current() === 'blue' && (c === '#e74c3c' || c === '#ff6b6b')) ? '#FB8C00' : c; };

    function init() { apply(current()); }
    if (document.body) init();
    else document.addEventListener('DOMContentLoaded', init);
})();
