// Скрипт для проверки загрузки шрифтов SF Pro
document.addEventListener('DOMContentLoaded', function() {
    const fontsToCheck = [
        { name: 'SF Pro Display', weight: 'normal' },
        { name: 'SF Pro Display', weight: 'bold' },
        { name: 'SF Pro Display', weight: '500' }
    ];
    
    // Проверяем доступность каждого шрифта
    Promise.all(fontsToCheck.map(font => {
        return new Promise((resolve) => {
            if ('fonts' in document) {
                document.fonts.load(`1em "${font.name}"`, 'A').then(() => {
                    console.log(`Шрифт ${font.name} (${font.weight}) успешно загружен`);
                    resolve(true);
                }).catch(err => {
                    console.error(`Ошибка при загрузке шрифта ${font.name} (${font.weight}):`, err);
                    resolve(false);
                });
            } else {
                console.log('Font Loading API не поддерживается в этом браузере');
                resolve(false);
            }
        });
    })).then(results => {
        const allFontsLoaded = results.every(result => result);
        if (!allFontsLoaded) {
            console.warn('Некоторые шрифты SF Pro не были загружены');
        }
    });
}); 