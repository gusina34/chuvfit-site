// Общее для всех страниц: ссылки из config.js, меню на телефоне, отправка в Google Таблицу.
{
    const S = window.SITE;
    const links = {
        tg: 'https://t.me/' + S.telegram,
        ig: 'https://instagram.com/' + S.instagram,
        bot: 'https://t.me/' + S.bot
    };
    document.querySelectorAll('[data-link]').forEach(a => { a.href = links[a.dataset.link]; });
    document.querySelectorAll('[data-text]').forEach(el => {
        el.textContent = { tg: '@' + S.telegram, ig: '@' + S.instagram, bot: '@' + S.bot, price: S.marathonPrice }[el.dataset.text];
    });

    const burger = document.querySelector('.burger');
    if (burger) burger.addEventListener('click', () => {
        const open = document.body.classList.toggle('menu-open');
        burger.setAttribute('aria-expanded', open);
    });

    window.esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    // Отправка заявки. Возвращает true, если таблица приняла данные.
    window.sendToSheet = async (type, data) => {
        if (!S.scriptUrl) return false;
        try {
            const r = await fetch(S.scriptUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({ type, data })
            });
            const j = await r.json();
            return !!(j && j.ok);
        } catch (e) {
            return false;
        }
    };

    window.copyText = async text => {
        try { await navigator.clipboard.writeText(text); return true; } catch (e) { return false; }
    };

    window.telegramLink = links.tg;
}
