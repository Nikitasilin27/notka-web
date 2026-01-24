/**
 * Настройка тестового окружения
 *
 * Этот файл запускается перед каждым тестовым файлом.
 * Добавляйте сюда глобальные моки и настройки.
 */

import '@testing-library/jest-dom';

// Мок для matchMedia (требуется для Gravity UI)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // устаревший
    removeListener: vi.fn(), // устаревший
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Мок для localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Мок для ResizeObserver (требуется для некоторых компонентов Gravity UI)
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Подавляем console.error в тестах для ожидаемых ошибок
// Раскомментируйте при необходимости:
// vi.spyOn(console, 'error').mockImplementation(() => {});
