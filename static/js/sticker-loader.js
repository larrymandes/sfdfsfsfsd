// Функция для проверки наличия и загрузки временных Lottie стикеров
document.addEventListener('DOMContentLoaded', function() {
    // URL для стикеров
    const stickerURLs = {
        loading: 'https://assets9.lottiefiles.com/packages/lf20_06a6pf9i.json',
        loading2: 'https://assets5.lottiefiles.com/packages/lf20_V4Qla8.json',
        start: 'https://assets6.lottiefiles.com/packages/lf20_4zmudffy.json',
        win: 'https://assets3.lottiefiles.com/packages/lf20_touohxv0.json',
        lose1: 'https://assets5.lottiefiles.com/packages/lf20_qalg9rfd.json',
        lose2: 'https://assets7.lottiefiles.com/packages/lf20_ysrn2iwp.json'
    };

    // Функция для исправления путей стикеров
    function fixStickerPaths() {
        // Получаем все lottie-player элементы
        const lottiePlayers = document.querySelectorAll('lottie-player');
        
        // Для каждого элемента проверяем путь
        lottiePlayers.forEach(player => {
            const src = player.getAttribute('src');
            
            // Если путь к локальному файлу и файл не существует или возникла ошибка загрузки
            if (src && src.includes('/static/stickers/')) {
                // Извлекаем имя файла без расширения
                const fileName = src.split('/').pop().split('.')[0];
                
                // Обработчик ошибок при загрузке
                player.addEventListener('error', function() {
                    console.log(`Ошибка загрузки ${src}, загружаем временный стикер`);
                    if (stickerURLs[fileName]) {
                        player.setAttribute('src', stickerURLs[fileName]);
                    }
                });
                
                // Проверяем временно через fetch
                fetch(src)
                    .then(response => {
                        if (!response.ok) {
                            throw new Error('Файл не найден');
                        }
                    })
                    .catch(error => {
                        console.log(`Не удалось загрузить ${src}: ${error.message}`);
                        if (stickerURLs[fileName]) {
                            player.setAttribute('src', stickerURLs[fileName]);
                        }
                    });
            }
        });
    }
    
    // Запускаем проверку через небольшую задержку
    setTimeout(fixStickerPaths, 500);
}); 