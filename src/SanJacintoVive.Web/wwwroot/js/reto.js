(() => {
  'use strict';
  const panel = document.querySelector('[data-quiz]');
  if (!panel) return;
  const questions = [
    { q: '¿En qué fecha se libró la Batalla de San Jacinto?', options: ['15 de septiembre de 1821', '14 de septiembre de 1856', '1 de mayo de 1857'], correct: 1, why: 'El 14 de septiembre de 1856 ocurrió la batalla. La independencia centroamericana se conmemora el 15 de septiembre y es un acontecimiento diferente.', source: 'mined' },
    { q: '¿Quién dirigió la defensa nicaragüense de la hacienda?', options: ['José Dolores Estrada', 'William Walker', 'Byron Cole'], correct: 0, why: 'El coronel José Dolores Estrada organizó la defensa y ordenó la maniobra de flanqueo. Walker no dirigió presencialmente el ataque a la hacienda.', source: 'mined' },
    { q: '¿Qué ayuda a explicar la llegada de Walker a Nicaragua?', options: ['Una invitación de una república ya unificada', 'Una visita diplomática sin tropas', 'La contratación de apoyo extranjero durante una guerra civil'], correct: 2, why: 'El enfrentamiento entre legitimistas y democráticos llevó a buscar apoyo militar extranjero. Walker aprovechó esa división para construir su propio poder.', source: 'perez' },
    { q: '¿Qué decisión se relaciona con el Pacto Providencial?', options: ['Unir fuerzas de antiguos adversarios contra el filibusterismo', 'Entregar la presidencia a Byron Cole', 'Declarar terminada la guerra el 14 de septiembre'], correct: 0, why: 'El acuerdo del 12 de septiembre de 1856 acercó a legitimistas y democráticos frente a una amenaza compartida. La guerra continuó hasta 1857.', source: 'pacto' },
    { q: '¿Por qué recordar a los flecheros de Matagalpa?', options: ['Porque sustituyeron a todos los demás combatientes', 'Porque Walker los contrató para atacar la casa', 'Porque la defensa también tiene una historia indígena y colectiva'], correct: 2, why: 'Su memoria reconoce la participación de combatientes indígenas, más allá de los mandos más conocidos. La cifra tradicional del contingente es de 60 hombres.', source: 'flecheros' },
    { q: 'Además de resistir, ¿qué ayudó al desenlace del combate?', options: ['Un desembarco en la hacienda', 'El flanqueo por la retaguardia y el desconcierto por la caballada', 'La llegada de Walker para negociar en persona'], correct: 1, why: 'La maniobra sorprendió a los atacantes. El ruido de los caballos se interpretó como la llegada de fuerzas montadas y contribuyó al pánico.', source: 'arellano' },
    { q: '¿Cuál de estos hechos ocurrió después de la batalla?', options: ['La independencia de Centroamérica', 'El Pacto Providencial', 'El decreto esclavista de Walker del 22 de septiembre de 1856'], correct: 2, why: 'El orden importa: pacto el 12, batalla el 14 y decreto el 22 de septiembre. Comparar fechas evita explicar un hecho con otro que todavía no había ocurrido.', source: 'nicaraguense' },
    { q: 'Dos fuentes ofrecen cifras distintas. ¿Qué conviene hacer?', options: ['Escoger la cifra más grande', 'Comparar quién escribió, cuándo y con qué evidencias', 'Sumar ambas cifras para obtener el total'], correct: 1, why: 'La lectura crítica contrasta perspectivas y evidencias. Una memoria de un participante y un estudio posterior pueden describir el mismo hecho de manera distinta.', source: 'kinloch' }
  ];
  const $ = selector => document.querySelector(selector);
  const question = $('[data-question]');
  const options = $('[data-options]');
  const feedback = $('[data-feedback]');
  const next = $('[data-next]');
  const restart = $('[data-restart]');
  const scoreEl = $('[data-score]');
  let index = 0;
  let score = 0;
  let answered = false;
  const readBest = () => { try { return Math.max(0, Math.min(8, Number(localStorage.getItem('sanjacintovive.mejor')) || 0)); } catch { return 0; } };
  let best = readBest();
  const updateBest = () => { if (best) $('[data-best]').textContent = `Tu mejor recorrido: ${best} de 8 conexiones.`; };
  updateBest();
  const show = (focus = false) => {
    answered = false; feedback.hidden = true; feedback.replaceChildren(); next.hidden = true; restart.hidden = true;
    options.replaceChildren();
    const item = questions[index];
    $('[data-question-count]').textContent = `PREGUNTA ${String(index + 1).padStart(2, '0')} / 08`;
    $('.quiz-progress span').style.width = `${index / questions.length * 100}%`;
    question.textContent = item.q;
    item.options.forEach((text, position) => {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'quiz-option';
      const letter = document.createElement('span'); letter.textContent = 'ABC'[position]; letter.setAttribute('aria-hidden', 'true');
      button.append(letter, document.createTextNode(text));
      button.addEventListener('click', () => answer(position)); options.append(button);
    });
    if (focus) { question.tabIndex = -1; question.focus({ preventScroll: true }); }
  };
  const answer = position => {
    if (answered) return;
    answered = true;
    const item = questions[index];
    const correct = position === item.correct;
    if (correct) score++;
    scoreEl.textContent = String(score);
    [...options.children].forEach((button, i) => { button.disabled = true; if (i === item.correct) button.classList.add('correct'); else if (i === position) button.classList.add('wrong'); });
    const heading = document.createElement('strong'); heading.textContent = correct ? '¡Conexión encontrada!' : 'Una nueva pista para aprender.';
    const explanation = document.createElement('p'); explanation.textContent = item.why;
    const source = document.createElement('a'); source.href = window.Museo.url(`/biblioteca/${item.source}`); source.textContent = 'Seguir la pista hasta la fuente ↗';
    feedback.replaceChildren(heading, explanation, source); feedback.hidden = false;
    next.textContent = index === questions.length - 1 ? 'Ver mi recorrido →' : 'Siguiente pregunta →'; next.hidden = false;
    next.focus({ preventScroll: true });
  };
  const finish = () => {
    options.replaceChildren(); feedback.hidden = false; next.hidden = true; restart.hidden = false;
    question.textContent = score >= 6 ? 'La historia ya tiene nuevas conexiones.' : 'Cada pregunta abrió una nueva historia.';
    $('[data-question-count]').textContent = 'RECORRIDO COMPLETADO'; $('.quiz-progress span').style.width = '100%';
    const message = document.createElement('p'); message.className = 'quiz-finished'; message.textContent = `Conectaste ${score} de 8 respuestas. Podés recorrer de nuevo las salas, abrir las fuentes o volver a jugar. La curiosidad siempre suma.`;
    const link = document.createElement('a'); link.href = window.Museo.url('/biblioteca'); link.textContent = 'Seguir explorando el archivo ↗';
    feedback.replaceChildren(message, link);
    best = Math.max(best, score);
    try { localStorage.setItem('sanjacintovive.mejor', String(best)); } catch { /* El reto funciona sin almacenamiento. */ }
    updateBest(); question.tabIndex = -1; question.focus({ preventScroll: true });
  };
  next.addEventListener('click', () => { if (!answered) return; index++; if (index === questions.length) finish(); else show(true); });
  restart.addEventListener('click', () => { index = 0; score = 0; scoreEl.textContent = '0'; show(true); });
  show();
})();
