// Анкета перед стартом. Вопросы здоровья основаны на подходе PAR-Q+ (скрининг перед тренировками).
// Ключи вопросов совпадают со столбцами в apps-script/Code.gs — меняйте их вместе.
{
const $ = id => document.getElementById(id);
const QA = [
    ['A1', 'Врач говорил о проблемах с сердцем или повышенном давлении?'],
    ['A2', 'Бывает боль или давление в груди — в покое или при нагрузке?'],
    ['A3', 'За последний год были сильные головокружения или потеря сознания?'],
    ['A4', 'Есть хроническое заболевание (диабет, щитовидная железа, астма и др.)?'],
    ['A5', 'Принимаете лекарства постоянно?'],
    ['A6', 'Врач говорил, что заниматься можно только под наблюдением?']
];
const QB = [
    ['B1', 'Боль в спине, коленях, плечах или других суставах?'],
    ['B2', 'Травмы или операции за последние 12 месяцев?'],
    ['B3', 'Грыжи или протрузии (в том числе межпозвонковые)?'],
    ['B4', 'Остеопороз или остеопения?'],
    ['B5', 'Варикоз или проблемы с венами?'],
    ['B6', 'Подтекание мочи при прыжках, кашле, чихании?'],
    ['B7', 'Диастаз (расхождение мышц живота)?'],
    ['B8', 'Беременность сейчас или роды меньше года назад?'],
    ['B9', 'Перименопауза или менопауза (приливы, нерегулярный цикл)?']
];
// Ответ «да» здесь — нужен допуск врача перед стартом
const RED = ['A1', 'A2', 'A3', 'A6', 'B8'];
const TEXT = {
    txt1: [['inv', 'Какой инвентарь есть дома (коврик, резинки, гантели)?'], ['exp', 'Тренировались за последние 3 месяца? Сколько раз в неделю, какой опыт?'], ['steps', 'Сколько шагов в день проходите (примерно)?']],
    txt2: [['food', 'Сколько раз в день едите? Что ели вчера на завтрак, обед, ужин и перекусы?'], ['water', 'Сколько воды пьёте в день?'], ['allerg', 'Аллергии, непереносимость, чего не едите?'], ['sweets', 'Как часто сладкое, выпечка, фастфуд, алкоголь?'], ['counted', 'Считали калории или КБЖУ раньше? Как ощущения?']],
    txt3: [['goal21', 'Чего хотите достичь за 21 день? Цифрой, если можно (см, кг, число тренировок)'], ['goal90', 'А через 3 месяца?'], ['why', 'Что изменится в вашей жизни, когда вы этого достигнете?'], ['block', 'Что мешало раньше?'], ['time', 'Сколько раз в неделю и сколько минут реально готовы тренироваться?'], ['sure', 'Насколько уверены, что дойдёте до конца, от 1 до 10?']],
    txt4: [['sleep', 'Сколько часов спите? Просыпаетесь отдохнувшей?'], ['stress', 'Уровень стресса в последний месяц, от 1 до 10'], ['work', 'Работа: сидячая, на ногах или физически тяжёлая?'], ['support', 'Кто из близких поддержит, а кто может мешать?']]
};

const yn = ([k, q]) => '<div class="yn" role="radiogroup" aria-label="' + esc(q) + '"><span>' + esc(q) + '</span><div class="seg">' +
    '<label><input type="radio" name="' + k + '" value="да"><span>Да</span></label>' +
    '<label><input type="radio" name="' + k + '" value="нет"><span>Нет</span></label></div></div>';
$('qa').innerHTML = QA.map(yn).join('');
$('qb').innerHTML = QB.map(yn).join('');
Object.entries(TEXT).forEach(([box, list]) => {
    $(box).innerHTML = list.map(([k, q]) => '<label for="f_' + k + '">' + esc(q) + '</label><textarea id="f_' + k + '" name="' + k + '"></textarea>').join('');
});

const form = $('af');
const KEY = 'chuvfit_anketa';
// Черновик: ответы не теряются, если закрыть страницу
try {
    const draft = JSON.parse(localStorage.getItem(KEY) || '{}');
    Object.entries(draft).forEach(([k, v]) => {
        form.querySelectorAll('[name="' + k + '"]').forEach(el => {
            if (el.type === 'radio') el.checked = el.value === v;
            else if (el.type === 'checkbox') el.checked = !!v;
            else el.value = v;
        });
    });
} catch (e) { /* нет хранилища */ }

function collect() {
    const data = {};
    form.querySelectorAll('[name]').forEach(el => {
        if (el.type === 'radio') { if (el.checked) data[el.name] = el.value; }
        else if (el.type === 'checkbox') data[el.name] = el.checked;
        else data[el.name] = el.value.trim();
    });
    return data;
}
form.addEventListener('input', () => { try { localStorage.setItem(KEY, JSON.stringify(collect())); } catch (e) { /* нет хранилища */ } });

function summary(d) {
    const L = ['АНКЕТА — ' + d.name + ' (' + d.contact + ')', 'Возраст ' + (d.age || '—') + ', рост ' + (d.height || '—') + ', вес ' + (d.weight || '—') + '; тренировки: ' + (d.place || '—'), ''];
    QA.concat(QB).forEach(([k, q]) => L.push(k + '. ' + q + ' — ' + (d[k] || '—')));
    if (d.details) L.push('Пояснения: ' + d.details);
    L.push('');
    Object.values(TEXT).flat().forEach(([k, q]) => { if (d[k]) L.push(q + ' ' + d[k]); });
    if (d.stage) L.push('Стадия: ' + d.stage);
    return L.join('\n');
}

form.addEventListener('submit', async e => {
    e.preventDefault();
    const d = collect(), err = $('err');
    const missing = QA.concat(QB).filter(([k]) => !d[k]);
    const problem = !d.name || !d.contact ? 'Напишите имя и Telegram или телефон.' :
        missing.length ? 'Ответьте на все вопросы о здоровье: осталось ' + missing.length + '.' :
        !(d.ok1 && d.ok2 && d.ok3) ? 'Отметьте все три пункта согласия.' : '';
    if (problem) { err.innerHTML = '<div class="warn">' + esc(problem) + '</div>'; return; }
    if (d.website) return; // защита от спам-ботов
    err.innerHTML = '<p class="note">Отправляю…</p>';
    const red = RED.some(k => d[k] === 'да');
    const ok = await sendToSheet('anketa', d);
    const doctor = red ? '<div class="warn">По вашим ответам перед стартом нужно разрешение врача на занятия. До этого Нина подберёт мягкую нагрузку.</div>' : '';
    const done = $('done');
    form.hidden = true; done.hidden = false;
    if (ok) {
        try { localStorage.removeItem(KEY); } catch (e2) { /* нет хранилища */ }
        done.innerHTML = '<h2>Спасибо, анкета у тренера!</h2>' + doctor + '<p class="lead">Нина свяжется с вами в Telegram или по телефону. А пока можно рассчитать норму КБЖУ.</p><div class="btns"><a class="btn" href="kbju.html">Калькулятор КБЖУ</a></div>';
    } else {
        const text = summary(d);
        done.innerHTML = '<h2>Осталось отправить</h2>' + doctor + '<p class="lead">Скопируйте анкету и отправьте её Нине в Telegram.</p><div class="btns"><button class="btn" id="cp">Скопировать анкету</button><a class="btn ghost" href="' + esc(telegramLink) + '" target="_blank" rel="noopener">Открыть Telegram</a></div><pre></pre>';
        done.querySelector('pre').textContent = text;
        $('cp').onclick = async () => { $('cp').textContent = (await copyText(text)) ? 'Скопировано ✓' : 'Выделите текст ниже'; };
    }
    scrollTo(0, 0);
});
}
