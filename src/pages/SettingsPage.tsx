import { useState } from 'react';
import { Switch, RadioGroup, Radio } from '@gravity-ui/uikit';
import { Icon } from '@gravity-ui/uikit';
import { Moon, Sun, Globe, ChevronDown, ChevronUp } from '@gravity-ui/icons';
import { useTheme } from '../hooks/useTheme';
import { useI18n, Language } from '../hooks/useI18n';

export function SettingsPage() {
  const { theme, toggleTheme } = useTheme();
  const { t, lang, setLang } = useI18n();
  const [isLanguageOpen, setIsLanguageOpen] = useState(false);

  return (
    <div className="settings-page">
      <h1 className="page-title">{t.settings}</h1>
      
      <div className="settings-list">
        {/* Theme toggle */}
        <div className="settings-item">
          <div className="settings-item-info">
            <Icon data={theme === 'dark' ? Moon : Sun} size={20} />
            <span>{t.darkTheme}</span>
          </div>
          <Switch
            checked={theme === 'dark'}
            onUpdate={toggleTheme}
            size="m"
          />
        </div>
        
        {/* Language selector - custom accordion */}
        <div className="settings-accordion">
          <button 
            className="settings-accordion-header"
            onClick={() => setIsLanguageOpen(!isLanguageOpen)}
          >
            <div className="settings-item-info">
              <Icon data={Globe} size={20} />
              <span>{t.language}</span>
            </div>
            <Icon data={isLanguageOpen ? ChevronUp : ChevronDown} size={16} />
          </button>
          
          {isLanguageOpen && (
            <div className="settings-accordion-content">
              <RadioGroup
                value={lang}
                onUpdate={(value) => setLang(value as Language)}
                direction="vertical"
              >
                <Radio value="ru">
                  <div className="language-option">
                    <span className="language-name">Русский</span>
                    <span className="language-native">Russian</span>
                  </div>
                </Radio>
                <Radio value="en">
                  <div className="language-option">
                    <span className="language-name">English</span>
                    <span className="language-native">English</span>
                  </div>
                </Radio>
              </RadioGroup>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
