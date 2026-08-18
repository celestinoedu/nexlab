// GitHub Pages guarda o index.html em cache por 10 min. A cada deploy, os
// nomes dos assets mudam; se um HTML antigo pedir um script removido, recarrega
// uma única vez com cache-busting. O arquivo externo mantém a CSP sem inline JS.
(function () {
  var CHAVE = 'nexlab-recarregou-apos-falha'
  window.addEventListener(
    'error',
    function (evento) {
      var alvo = evento.target
      if (alvo && alvo.tagName === 'SCRIPT' && !sessionStorage.getItem(CHAVE)) {
        sessionStorage.setItem(CHAVE, '1')
        var semParametros = location.href.split('#')[0].split('?')[0]
        location.replace(semParametros + '?v=' + Date.now() + location.hash)
      }
    },
    true,
  )
})()
