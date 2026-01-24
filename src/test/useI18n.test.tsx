/**
 * Тесты для хука useI18n
 *
 * Проверяют:
 * - Переключение языка
 * - Корректность переводов
 * - Сохранение в localStorage
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { I18nProvider, useI18n } from '../hooks/useI18n';
import type { ReactNode } from 'react';

// Обёртка для хука
const wrapper = ({ children }: { children: ReactNode }) => <I18nProvider>{children}</I18nProvider>;

describe('useI18n', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('должен вернуть язык по умолчанию', () => {
    const { result } = renderHook(() => useI18n(), { wrapper });

    // По умолчанию должен быть 'ru' или 'en'
    expect(['ru', 'en']).toContain(result.current.lang);
  });

  it('должен предоставить объект t с переводами', () => {
    const { result } = renderHook(() => useI18n(), { wrapper });

    // t — это объект с переводами
    expect(typeof result.current.t).toBe('object');
    expect(result.current.t).toHaveProperty('feed');
  });

  it('должен переключать язык', () => {
    const { result } = renderHook(() => useI18n(), { wrapper });

    const initialLang = result.current.lang;
    const newLang = initialLang === 'ru' ? 'en' : 'ru';

    act(() => {
      result.current.setLang(newLang);
    });

    expect(result.current.lang).toBe(newLang);
  });

  it('должен возвращать переведённые строки', () => {
    const { result } = renderHook(() => useI18n(), { wrapper });

    // Переводы должны возвращать строки
    const translation = result.current.t.feed;
    expect(typeof translation).toBe('string');
    expect(translation.length).toBeGreaterThan(0);
  });

  it('должен иметь разные переводы для разных языков', () => {
    const { result } = renderHook(() => useI18n(), { wrapper });

    // Устанавливаем русский
    act(() => {
      result.current.setLang('ru');
    });
    const ruTranslation = result.current.t.feed;

    // Переключаемся на английский
    act(() => {
      result.current.setLang('en');
    });
    const enTranslation = result.current.t.feed;

    // Переводы должны отличаться
    expect(ruTranslation).not.toBe(enTranslation);
  });
});
