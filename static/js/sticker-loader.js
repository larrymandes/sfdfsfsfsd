// Функция для предварительной загрузки и кэширования всех Lottie стикеров
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

    // Кэш для хранения загруженных стикеров
    window.stickerCache = {};
    
    // Проверяем, есть ли в localStorage метка времени загрузки стикеров
    const stickersLoadTime = localStorage.getItem('stickersLoadTime');
    const currentTime = new Date().getTime();
    
    // Если метка времени есть и прошло менее 24 часов, пытаемся загрузить стикеры из localStorage
    if (stickersLoadTime && (currentTime - parseInt(stickersLoadTime)) < 24 * 60 * 60 * 1000) {
        try {
            // Восстанавливаем кэш стикеров из localStorage
            const cachedStickers = JSON.parse(localStorage.getItem('stickerCache') || '{}');
            
            // Если в кэше есть стикеры, используем их
            if (Object.keys(cachedStickers).length > 0) {
                window.stickerCache = cachedStickers;
                console.log('Стикеры успешно загружены из localStorage');
                return; // Выходим из функции, не загружаем стикеры заново
            }
        } catch (error) {
            console.error('Ошибка при загрузке стикеров из localStorage:', error);
            // В случае ошибки загрузим стикеры заново
        }
    }

    // Функция для предварительной загрузки всех стикеров
    function preloadAllStickers() {
        console.log('Загружаем стикеры заново...');
        
        // Очищаем кэш
        window.stickerCache = {};
        
        // Получаем все lottie-player элементы
        const lottiePlayers = document.querySelectorAll('lottie-player');
        
        // Счетчик загруженных стикеров
        let loadedStickers = 0;
        const totalStickers = lottiePlayers.length;
        
        // Для каждого элемента предзагружаем стикер
        lottiePlayers.forEach(player => {
            const src = player.getAttribute('src');
            
            if (src) {
                // Извлекаем имя файла без расширения
                const fileName = src.split('/').pop().split('.')[0];
                
                // Предзагрузка локального файла
                fetch(src)
                    .then(response => {
                        if (!response.ok) {
                            // Если локальный файл не найден, используем резервный URL
                            if (stickerURLs[fileName]) {
                                return fetch(stickerURLs[fileName]);
                            }
                            throw new Error('Файл не найден');
                        }
                        return response;
                    })
                    .then(response => response.json())
                    .then(data => {
                        // Сохраняем анимацию в кэше
                        window.stickerCache[fileName] = data;
                        console.log(`Стикер ${fileName} успешно загружен в кэш`);
                        
                        // Увеличиваем счетчик загруженных стикеров
                        loadedStickers++;
                        
                        // Если все стикеры загружены, сохраняем кэш в localStorage
                        if (loadedStickers === totalStickers) {
                            try {
                                localStorage.setItem('stickerCache', JSON.stringify(window.stickerCache));
                                localStorage.setItem('stickersLoadTime', currentTime.toString());
                                console.log('Все стикеры сохранены в localStorage');
                            } catch (error) {
                                console.error('Ошибка при сохранении стикеров в localStorage:', error);
                            }
                        }
                    })
                    .catch(error => {
                        console.log(`Не удалось загрузить ${src}: ${error.message}`);
                        // Пробуем загрузить из резервного URL
                        if (stickerURLs[fileName]) {
                            fetch(stickerURLs[fileName])
                                .then(response => response.json())
                                .then(data => {
                                    window.stickerCache[fileName] = data;
                                    console.log(`Резервный стикер ${fileName} успешно загружен в кэш`);
                                    
                                    // Увеличиваем счетчик загруженных стикеров
                                    loadedStickers++;
                                    
                                    // Если все стикеры загружены, сохраняем кэш в localStorage
                                    if (loadedStickers === totalStickers) {
                                        try {
                                            localStorage.setItem('stickerCache', JSON.stringify(window.stickerCache));
                                            localStorage.setItem('stickersLoadTime', currentTime.toString());
                                            console.log('Все стикеры сохранены в localStorage');
                                        } catch (error) {
                                            console.error('Ошибка при сохранении стикеров в localStorage:', error);
                                        }
                                    }
                                })
                                .catch(err => console.error(`Не удалось загрузить резервный стикер ${fileName}: ${err.message}`));
                        } else {
                            // Увеличиваем счетчик даже при ошибке, чтобы не заблокировать сохранение
                            loadedStickers++;
                        }
                    });
            }
        });
    }
    
    // Запускаем предзагрузку стикеров
    preloadAllStickers();
}); 
