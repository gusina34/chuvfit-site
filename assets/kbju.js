// Калькулятор КБЖУ (формула Миффлина — Сан Жеора) и конструктор меню.
{
const P = FOOD.products, S = FOOD.meals;
const $ = id => document.getElementById(id);
const EGG = 'Яйцо (1 шт ≈ 55 г)';
let st = { n: { age: 45, h: 165, w: 72, sex: 'f', act: '1.375', goal: 'loss', preg: false }, m: null };
let T = { k: 0, p: 0, f: 0, c: 0 };
try { const s = JSON.parse(localStorage.getItem('chuvfit_kbju') || 'null'); if (s && s.n) st = s; } catch (e) { /* нет хранилища */ }
const save = () => { try { localStorage.setItem('chuvfit_kbju', JSON.stringify(st)); } catch (e) { /* нет хранилища */ } };
const kOf = (k, g) => P[k] ? P[k][0] * g / 100 : 0;
const r5 = x => Math.max(5, Math.round(x / 5) * 5);

function calc() {
    const n = st.n, w = +n.w, h = +n.h, a = +n.age, warn = [];
    if (!(w >= 35 && w <= 250 && h >= 130 && h <= 220 && a >= 14 && a <= 90)) {
        $('nwarn').innerHTML = '<div class="warn">Проверьте возраст (14–90), рост в см и вес в кг.</div>';
        return false;
    }
    const bmr = 10 * w + 6.25 * h - 5 * a + (n.sex === 'm' ? 5 : -161), tdee = bmr * +n.act;
    const bmi = w / ((h / 100) ** 2);
    let goal = n.goal;
    if (n.preg && goal === 'loss') { goal = 'keep'; warn.push('При беременности и кормлении грудью калории не снижают. Норма посчитана на поддержание — обсудите питание с врачом и тренером.'); }
    if (goal === 'loss' && bmi < 18.5) { goal = 'keep'; warn.push('Вес уже ниже нормы, поэтому дефицит не нужен. Норма посчитана на поддержание.'); }
    let k = tdee * (goal === 'loss' ? 0.85 : goal === 'gain' ? 1.1 : 1);
    const floor = Math.max(n.sex === 'm' ? 1500 : 1200, bmr);
    if (goal === 'loss' && k < floor) { k = floor; warn.push('Норма поднята до безопасного минимума: ниже этого уровня худеть не стоит.'); }
    // При лишнем весе белок и жиры считаем от веса, соответствующего ИМТ 25
    const base = bmi > 27 ? 25 * (h / 100) ** 2 : w;
    const p = base * (goal === 'keep' ? 1.6 : 1.8), f = Math.max(0.8 * base, k * 0.25 / 9), c = Math.max(50, (k - p * 4 - f * 9) / 4);
    T = { k: Math.round(k / 10) * 10, p: Math.round(p), f: Math.round(f), c: Math.round(c) };
    $('kc').textContent = T.k; $('pg').textContent = T.p; $('fg').textContent = T.f; $('cg').textContent = T.c;
    $('bmr').textContent = 'Обмен в покое ≈ ' + Math.round(bmr) + ' ккал, с активностью ≈ ' + Math.round(tdee) + ' ккал. ИМТ ' + bmi.toFixed(1).replace('.', ',') + '.';
    const C = 2 * Math.PI * 82, parts = [[T.p * 4, 'var(--p)'], [T.f * 9, 'var(--f)'], [T.c * 4, 'var(--c)']];
    const sum = parts.reduce((s, x) => s + x[0], 0);
    let off = 0;
    $('ring').innerHTML = parts.map(([v, col]) => {
        const L = C * v / sum, o = off; off += L;
        return '<circle cx="110" cy="110" r="82" fill="none" stroke="' + col + '" stroke-width="24" stroke-dasharray="' + Math.max(0, L - 3) + ' ' + C + '" stroke-dashoffset="' + (-o) + '"/>';
    }).join('');
    $('nwarn').innerHTML = warn.map(t => '<div class="warn">' + esc(t) + '</div>').join('');
    return true;
}

// Блюдо подгоняется под долю калорий приёма пищи; овощи не масштабируются
function build(si, di) {
    const meal = S[si], items = meal.dishes[di][1], target = T.k * meal.share;
    let fixed = 0, scal = 0;
    items.forEach(([k, g, f]) => f ? fixed += kOf(k, g) : scal += kOf(k, g));
    const fac = Math.min(2.5, Math.max(0.5, (target - fixed) / (scal || 1)));
    return { d: di, it: items.map(([k, g, f]) => ({ k, g: f ? g : k === EGG ? Math.max(55, Math.round(g * fac / 55) * 55) : r5(g * fac) })) };
}
function regen() { st.m = S.map((meal, i) => build(i, Math.floor(Math.random() * meal.dishes.length))); save(); renderMenu(); }
function rescale() { if (st.m) { st.m = st.m.map((m, i) => m.d >= 0 ? build(i, m.d) : m); save(); renderMenu(); } }

const opts = Object.keys(P).sort((a, b) => a.localeCompare(b, 'ru')).map(k => '<option>' + esc(k) + '</option>').join('');
const tot = items => items.reduce((t, { k, g }) => {
    const x = P[k]; if (!x) return t;
    t.k += x[0] * g / 100; t.p += x[1] * g / 100; t.f += x[2] * g / 100; t.c += x[3] * g / 100; return t;
}, { k: 0, p: 0, f: 0, c: 0 });
const mealKcal = i => Math.round(tot(st.m[i].it).k) + ' из ~' + Math.round(T.k * S[i].share) + ' ккал';

function renderMenu() {
    if (!st.m || st.m.length !== S.length) return regen();
    $('meals').innerHTML = st.m.map((m, i) => {
        const meal = S[i];
        return '<div class="meal"><div class="mh"><h3>' + esc(meal.name) + '</h3><small>' + mealKcal(i) + '</small></div>' +
            '<label for="d' + i + '">Блюдо</label><select id="d' + i + '" data-m="' + i + '"><option value="-1"' + (m.d < 0 ? ' selected' : '') + '>Своё блюдо</option>' +
            meal.dishes.map((d, j) => '<option value="' + j + '"' + (m.d === j ? ' selected' : '') + '>' + esc(d[0]) + '</option>').join('') + '</select>' +
            m.it.map((x, j) => '<div class="it"><span>' + esc(x.k) + '</span><input type="number" inputmode="numeric" aria-label="Граммы: ' + esc(x.k) + '" data-m="' + i + '" data-j="' + j + '" value="' + (+x.g) + '"><span class="k">' + Math.round(kOf(x.k, x.g)) + ' ккал</span><button class="x" aria-label="Убрать ' + esc(x.k) + '" data-m="' + i + '" data-del="' + j + '">×</button></div>').join('') +
            (m.it.length ? '' : '<p class="note" style="margin:10px 0 0">Пока пусто — добавьте продукты ниже.</p>') +
            '<div class="add"><select aria-label="Продукт для: ' + esc(meal.name) + '" id="a' + i + '">' + opts + '</select><button class="btn ghost" data-add="' + i + '">Добавить</button></div></div>';
    }).join('');
    renderBars();
}
function renderBars() {
    const t = tot(st.m.flatMap(m => m.it));
    $('bars').innerHTML = [['Калории', 'k', 'ккал', 'var(--acc)'], ['Белки', 'p', 'г', 'var(--p)'], ['Жиры', 'f', 'г', 'var(--f)'], ['Углеводы', 'c', 'г', 'var(--c)']].map(([n, key, u, col]) => {
        const v = Math.round(t[key]);
        return '<div class="bar"><div class="l"><span>' + n + '</span><span>' + v + ' / ' + T[key] + ' ' + u + '</span></div><div class="t"><i style="width:' + Math.min(100, v / (T[key] || 1) * 100) + '%;background:' + col + '"></i></div></div>';
    }).join('');
    document.querySelectorAll('#meals .meal small').forEach((el, i) => { el.textContent = mealKcal(i); });
}

$('meals').addEventListener('change', e => {
    const el = e.target;
    if (el.tagName === 'SELECT' && el.id.startsWith('d')) {
        const i = +el.dataset.m, d = +el.value;
        st.m[i] = d < 0 ? { d: -1, it: [] } : build(i, d);
        save(); renderMenu();
    }
});
$('meals').addEventListener('input', e => {
    const el = e.target;
    if (el.dataset.j == null) return;
    const x = st.m[+el.dataset.m].it[+el.dataset.j];
    x.g = Math.max(0, Math.min(2000, +el.value || 0));
    st.m[+el.dataset.m].d = -1;
    el.nextElementSibling.textContent = Math.round(kOf(x.k, x.g)) + ' ккал';
    save(); renderBars();
});
$('meals').addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.del != null) { const m = st.m[+b.dataset.m]; m.it.splice(+b.dataset.del, 1); m.d = -1; }
    else if (b.dataset.add != null) { const i = +b.dataset.add; st.m[i].it.push({ k: $('a' + i).value, g: 100 }); st.m[i].d = -1; }
    else return;
    save(); renderMenu();
});
$('regen').onclick = regen;
$('clear').onclick = () => { st.m = S.map(() => ({ d: -1, it: [] })); save(); renderMenu(); };

['age', 'h', 'w', 'sex', 'act', 'goal'].forEach(id => {
    $(id).value = st.n[id];
    $(id).addEventListener('input', () => { st.n[id] = $(id).value; save(); if (calc()) rescale(); });
});
$('preg').checked = !!st.n.preg;
$('preg').addEventListener('change', () => { st.n.preg = $('preg').checked; save(); if (calc()) rescale(); });

// ---- Отправка тренеру ----
function menuText() {
    const t = tot(st.m.flatMap(m => m.it)), n = st.n;
    const lines = [
        'Возраст ' + n.age + ', рост ' + n.h + ' см, вес ' + n.w + ' кг',
        'Цель: ' + $('goal').selectedOptions[0].text + '; активность: ' + $('act').selectedOptions[0].text + (n.preg ? '; беременность/ГВ' : ''),
        'Норма: ' + T.k + ' ккал, Б ' + T.p + ', Ж ' + T.f + ', У ' + T.c, ''
    ];
    st.m.forEach((m, i) => { if (m.it.length) lines.push(S[i].name + ': ' + m.it.map(x => x.k + ' ' + x.g + ' г').join(', ') + ' (' + Math.round(tot(m.it).k) + ' ккал)'); });
    lines.push('Итого: ' + Math.round(t.k) + ' ккал, Б ' + Math.round(t.p) + ', Ж ' + Math.round(t.f) + ', У ' + Math.round(t.c));
    return { text: lines.join('\n'), t };
}
$('sendf').addEventListener('submit', async e => {
    e.preventDefault();
    const name = $('nm').value.trim(), contact = $('ct').value.trim(), out = $('sres');
    if (!name || !contact) { out.innerHTML = '<div class="warn">Напишите имя и Telegram или телефон, чтобы тренер мог ответить.</div>'; return; }
    if ($('hp').value) return;
    const { text, t } = menuText();
    out.innerHTML = '<p class="note">Отправляю…</p>';
    const ok = await sendToSheet('menu', {
        name, contact, age: st.n.age, height: st.n.h, weight: st.n.w, goal: $('goal').selectedOptions[0].text,
        norm: T.k + ' ккал, Б ' + T.p + ', Ж ' + T.f + ', У ' + T.c,
        kcal: Math.round(t.k), p: Math.round(t.p), f: Math.round(t.f), c: Math.round(t.c), menu: text
    });
    if (ok) { out.innerHTML = '<div class="okbox">Готово! Меню у тренера. Нина ответит вам в Telegram или по телефону.</div>'; return; }
    const full = 'Меню от ' + name + ' (' + contact + ')\n' + text;
    out.innerHTML = '<div class="warn">Отправьте меню в Telegram: скопируйте текст и вставьте в сообщение.</div><div class="btns"><button class="btn" id="cp">Скопировать</button><a class="btn ghost" href="' + esc(telegramLink) + '" target="_blank" rel="noopener">Открыть Telegram</a></div><pre></pre>';
    out.querySelector('pre').textContent = full;
    $('cp').onclick = async () => { $('cp').textContent = (await copyText(full)) ? 'Скопировано ✓' : 'Выделите текст ниже'; };
});

if (calc()) renderMenu();
}
