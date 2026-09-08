---
name: Контур
description: Тёплая редакционная система для осознанной проверки работодателей.
colors:
  accent: "#ff5a1f"
  accent-ink: "#9e3c17"
  deep: "#0d0b0a"
  darkest: "#080605"
  wash: "#f1e7db"
  surface: "#fff8f0"
  surface-warm: "#fff2e7"
  surface-tint: "#e9d7c7"
  ink: "#1a120e"
  muted: "#6d5c52"
  tint-ink: "#5f493d"
  line: "#d7c5b5"
  line-strong: "#9b6d52"
typography:
  display:
    fontFamily: "Manrope, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(38px, 7vw, 68px)"
    fontWeight: 750
    lineHeight: 0.97
  headline:
    fontFamily: "Manrope, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(28px, 4vw, 39px)"
    fontWeight: 750
    lineHeight: 1.05
  body:
    fontFamily: "Manrope, ui-sans-serif, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "IBM Plex Mono, ui-monospace, monospace"
    fontSize: "11px"
    fontWeight: 600
    letterSpacing: "0.08em"
  metric:
    fontFamily: "Oswald, Manrope, sans-serif"
    fontSize: "22px"
    fontWeight: 500
    lineHeight: 1
  accent-display:
    fontFamily: "Boldonse, Arial Black, sans-serif"
    fontSize: "clamp(68px, 9.4vw, 156px)"
    fontWeight: 400
    lineHeight: 0.86
  placeholder:
    fontFamily: "Bitcount Single Variable, IBM Plex Mono, monospace"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.2
rounded:
  sharp: "0px"
  circle: "50%"
spacing:
  xs: "8px"
  sm: "13px"
  md: "22px"
  lg: "37px"
  section: "108px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.deep}"
    rounded: "{rounded.sharp}"
    padding: "0 20px"
    height: "46px"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.sharp}"
    padding: "9px 13px"
    height: "44px"
  input-search:
    backgroundColor: "#fff8f1"
    textColor: "{colors.ink}"
    rounded: "{rounded.sharp}"
    padding: "0 12px"
    height: "62px"
---

# Design System: Контур

## Overview

**Creative North Star: “Редакционный реестр доверия”**

Контур соединяет эстетику независимого журнала, рабочей панели и материального доказательства. Система должна ощущаться уверенной, тёплой и немного собранной вручную: тёмный кофейный фон даёт вес, терракотовый акцент отмечает проверку и действие, а бумажные поверхности удерживают длинные объяснения и данные.

Главная страница работает в режиме Persuade: она быстро объясняет ценность проверки, затем показывает пример отчёта и голоса сотрудников. Визуальная плотность строится не на большом количестве карточек, а на чередовании тёмных полос, бумажных панелей, фотографий и моноширинных меток.

**Key Characteristics:**

- тёплая бумажно-кофейная палитра с редким терракотовым акцентом;
- квадратные, уверенные поверхности вместо мягкой SaaS-скруглённости;
- Manrope для человеческого текста, IBM Plex Mono для метаданных и Boldonse для фоновой кинетической типографики;
- движение объясняет проверку, доверие, появление данных и изменение состояния.

## Colors

Палитра держится на контрасте “ночная редакция / тёплая бумага”. Акцент используется для действий, подтверждения и важных сигналов, а не как равномерная заливка.

### Primary

- **Терракотовый сигнал** (#ff5a1f): основные CTA, маркеры проверки, активные показатели и фирменные акценты.
- **Терракотовый текст** (#9e3c17): читаемый вариант акцента на светлых поверхностях.

### Neutral

- **Кофейная ночь** (#0d0b0a): hero, header и тёмные продуктовые поверхности.
- **Глубокий футер** (#080605): нижняя граница страницы.
- **Тёплая бумага** (#f1e7db): базовый canvas.
- **Карточная бумага** (#fff8f0): отчёты и контентные панели.
- **Тёплая поверхность** (#fff2e7): hero-report и выделенные состояния.
- **Тональная заливка** (#e9d7c7): вторичные секции и переключатели.
- **Основной текст** (#1a120e): заголовки и значения.
- **Приглушённый текст** (#6d5c52): вторичные подписи и метаданные.
- **Граница** (#d7c5b5): тонкие разделители и рамки.

### Named Rules

**The Signal Rule.** Терракотовый цвет появляется там, где пользователю нужно заметить действие, подтверждение или изменение состояния. Он не должен превращаться в общий фон.

## Typography

**Display Font:** Manrope (с системным sans-serif fallback)

**Body Font:** Manrope

**Label/Mono Font:** IBM Plex Mono

**Metric Font:** Oswald используется для крупных числовых показателей и не заменяет основной текст.

**Accent Display:** Boldonse используется только для крупной фоновой кинетической типографики.

**Character:** Manrope делает продукт прямым и человеческим; IBM Plex Mono добавляет ощущение реестра и измеримости; Boldonse работает как шум печатного заголовка за hero-контентом, но не используется для длинного чтения.

### Hierarchy

- **Display** (750, `clamp(38px, 7vw, 68px)`, `.97`): главный тезис hero.
- **Headline** (750, `clamp(28px, 4vw, 39px)`, `1.05`): заголовки секций.
- **Title** (700–800, `15–19px`): названия компаний, сигналов и элементов отчёта.
- **Metric** (500, Oswald, `22–42px`): крупные числовые значения, score и trust-ticker statistics.
- **Body** (400–500, `14–17px`, `1.45–1.55`): описания, отзывы и пояснения; держать меру около 45–75 символов.
- **Label** (600, `9–12px`, моноширинный, tracking `0.05–0.1em`): статусы, даты, номера и технические подписи.

### Named Rules

**The Two Voices Rule.** В одном блоке достаточно одной основной sans-роли и одной моноширинной мета-роли. Декоративный Boldonse остаётся за контентом и никогда не конкурирует с читаемым текстом.

## Layout

Страница использует широкую редакционную полосу с максимальной шириной 1280px и горизонтальными полями `max(28px, calc((100vw - 1280px) / 2))`. Hero строится на двух колонках: текст и действие слева, доказательная композиция справа. Ниже контент чередует full-bleed marquee, двухколоночные объяснения, сетку отзывов и тёмный CTA.

На ширине до 820px hero становится вертикальным, до 680px header переходит в мобильное меню, карточки отзывов становятся одной колонкой, а отчёты сохраняют горизонтальный touch-марquee. На ширине 320px контент не должен требовать горизонтального scroll страницы.

## Elevation & Depth

Система использует гибрид: тонкие рамки и тональные поверхности — по умолчанию, мягкая тень — для плавающего hero-report и временных уведомлений. Жёсткая терракотово-кофейная тень разрешена только у фирменного hero-report как часть материальной печатной метафоры.

### Shadow Vocabulary

- **Hero report:** `16px 18px 0 #442419, 0 25px 40px rgba(0, 0, 0, .38)` — главный материальный объект hero.
- **Status notice:** `0 8px 26px rgba(20, 9, 4, .22)` — временная связь действия и результата.
- **Hover card:** `7px 8px 0 #d6b699` — только на pointer/hover, отключается для reduced motion и touch.

## Shapes

Основные компоненты квадратные или почти квадратные: `0px` radius, тонкая рамка и чёткая геометрия. Круг разрешён только для score rings и live dots, где он описывает измерение или сигнал. Изображения обрезаются через `object-fit: cover`, а не через декоративные маски.

## Components

### Buttons

- **Shape:** квадратный, без radius; touch targets не меньше 44px.
- **Primary:** терракотовый фон, тёмный текст, `46–62px` по высоте в зависимости от контекста.
- **Hover / Focus:** светлеющий акцент, лёгкий `translateY`, общий `3px` focus outline.
- **Secondary / Ghost:** прозрачный фон, тонкая рамка или underline, приглушённый текст.

### Chips

- **Style:** тёмный прозрачный фон, тонкая кофейная рамка, светлый текст.
- **State:** используются для популярных поисков; на mobile не меньше 44px по высоте.

### Cards / Containers

- **Corner Style:** sharp `0px`.
- **Background:** бумажные поверхности `surface`, `surface-warm` или тёмные панели.
- **Shadow Strategy:** см. Elevation & Depth; не добавлять общую тень ко всем карточкам.
- **Border:** `1px` warm line.
- **Internal Padding:** `17–25px` внутри карточек, `73–145px` между секциями.

### Inputs / Fields

- **Style:** светлая квадратная search-панель с иконкой и CTA внутри.
- **Focus:** accent border, мягкое focus glow и небольшой подъём панели.
- **Error / Disabled:** ошибка — текст под полем с `role="alert"`; неизвестный профиль — честный empty state без фиктивных рейтингов.

### Navigation

- **Desktop:** тёмный header, бренд слева, якорные ссылки по центру, actions справа.
- **Mobile:** меню открывается реальной кнопкой с `aria-expanded` и `aria-controls`; панель остаётся частью тёмного header.

### Signature Component: Trust Report

Отчёт компании — основной reusable pattern для будущих страниц: статус проверки, название, метаданные, score, рейтинг-линии, insight и подтверждённые истории. Любое значение должно быть связано с конкретной компанией или явно помечено как недостаток данных.

## Do's and Don'ts

### Do:

- **Do** использовать терракотовый как сигнал действия или подтверждения.
- **Do** показывать статус данных рядом с рейтингом и не скрывать empty state.
- **Do** добавлять motion только там, где он объясняет проверку, переход или feedback.
- **Do** сохранять квадратную геометрию и тёплую бумажную фактуру.
- **Do** проверять mobile, keyboard focus и reduced motion.

### Don't:

- **Don't** показывать статические рейтинги под именем произвольной компании.
- **Don't** превращать декоративные подписи в неработающие кнопки или вкладки.
- **Don't** добавлять pill-shaped SaaS UI, градиентный текст или универсальные blur-карточки.
- **Don't** использовать Boldonse или mono для длинного текста.
- **Don't** запускать бесконечные offscreen-анимации.
