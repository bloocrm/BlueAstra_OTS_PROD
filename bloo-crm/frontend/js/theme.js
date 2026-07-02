/*
  Copyright (c) 2026 Blue Astra Technologies LLP, India. All Rights Reserved.
  Application-wide theme switcher (Red / Royal Blue / Black & Yellow).
*/
(function () {
    var VALID = ['red', 'blue', 'black-yellow'];
    function current() {
        var t = localStorage.getItem('crmTheme');
        return VALID.indexOf(t) !== -1 ? t : 'red';
    }
    function apply(t) {
        if (VALID.indexOf(t) === -1) t = 'red';
        document.body.setAttribute('data-theme', t);
        localStorage.setItem('crmTheme', t);
        var sel = document.getElementById('themePicker');
        if (sel && sel.value !== t) sel.value = t;
    }
    // Expose globally
    window.setCrmTheme = apply;
    window.getCrmTheme = current;

    function init() { apply(current()); }
    if (document.body) init();
    else document.addEventListener('DOMContentLoaded', init);
})();
