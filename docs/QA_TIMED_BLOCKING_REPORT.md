# QA: блокировка сайтов на время

Обновление от 8 сентября: B1–B4 исправлены и прошли [целевую повторную проверку](QA_TIMED_BLOCKING_RETEST.md). Ниже сохранён первоначальный отчёт о состоянии до исправлений; его FAIL-статусы относятся к той версии.

Дата: 7 сентября 2026 года, Asia/Nicosia. План: [QA_TIMED_BLOCKING.md](QA_TIMED_BLOCKING.md).

**Рекомендация: требуются исправления.** Подтверждены четыре дефекта: две существовавшие гонки P1, существовавшая проблема восстановления worker P2 и новая регрессия P3 — MobX warning при Delete. Само удаление работает. Основные сценарии длительности, валидации и интерфейса прошли в описанной ниже тестовой среде. Установленное расширение, перезапуск браузера и межустройственная синхронизация не проверены; это не заключение о готовности релиза.

Реализация, конфигурация, зависимости и существующие тесты во время QA не изменялись. Исправления, коммиты, публикации и изменения личных данных браузера не выполнялись.

## Проверенная версия и среда

- Репозиторий: `/Users/maximtopclaw/.codex/worktrees/34b3/website-blocker`.
- Базовый HEAD: `2b641b6b3a828d7664e325c10b79e6309e247c00`; проверены текущие незакоммиченные изменения timed blocking.
- Версия package и обоих собранных manifest: `1.2.7`.
- macOS `26.6.2` (`25G83`), arm64; Node `v24.19.0`, pnpm `11.18.0`.
- UI: CUA, встроенный браузер IAB, Chromium User-Agent `Chrome/152.0.0.0`; текущий `dist/dev/chrome`, HTTP fixture на `127.0.0.1:4189`. Проверены ширины 1280 и 320 px.
- Source fingerprint SHA-256: `84b14767fba35bd0c167caed8521352956d9433414f2b1e517c5f0c158765c90`. Это SHA-256 JSON-массива `{path,sha256}` для 51 файла из `git ls-files src package.json pnpm-lock.yaml tsconfig.json .swcrc scripts/build`, с содержимым рабочего дерева. Полный список: `/tmp/website-blocker-qa-fingerprint.json`.
- Release ZIP: `dist/release/chrome.zip`, 462507 байт, SHA-256 `b59d92df45e35af91752faa5c5c528677ad69c48e7ba1b1374203394001e8075`. Все 12 файлов архива побайтно совпали с release directory. Dev/release manifests полностью совпали с HEAD, кроме версии, выставляемой из package. Разрешения прежние: `webNavigation`, `storage`, `tabs`.

Обозначения evidence:

| Код | Что реально исполнено | Артефакты |
| --- | --- | --- |
| B | Штатные проверки и две сборки текущего source | `/tmp/website-blocker-qa-build.log`, `/tmp/website-blocker-qa-fingerprint.json` |
| C | Настоящие Websites/background/SettingsStore, установленный SWC и MobX; управляемые storage, navigation, Date и interval в отдельном Node process | `/tmp/website-blocker-core-qa.cjs`, `/tmp/website-blocker-core-qa-results.json` |
| S | Настоящие модули current и HEAD; независимые контексты, снимки storage, события и ошибки под контролем harness | `/tmp/website-blocker-storage-qa.cjs`, `/tmp/website-blocker-storage-qa-results.json`, `/tmp/website-blocker-storage-qa-evidence.md` |
| U | Настоящий собранный React UI, проверенный через CUA; `browser.storage.sync` заменён отдельным namespaced localStorage | `/tmp/website-blocker-ui-qa.cjs`, `/tmp/website-blocker-ui-qa-events.jsonl`, `/tmp/website-blocker-ui-qa-evidence.md`; screenshots в CUA-сеансе QA |
| W | Сравнение current/HEAD с настоящим MobX и конфигурацией RootStore для warning при Delete | `/tmp/website-blocker-delete-warning.cjs`, `/tmp/website-blocker-delete-warning-results.json` |

**C/S/U не являются настоящим Chrome extension environment.** В частности, вызов mocked `tabs.update` доказывает решение обработчика, но не реальную переадресацию вкладки; новый экземпляр JS-модуля не доказывает нативную остановку worker. U использует свою тестовую область данных, а не пользовательскую storage.sync.

## Команды и результат

| Проверка | Результат |
| --- | --- |
| `pnpm check` | PASS: ESLint TS, TypeScript и Vitest; 4 файла тестов, 44 passed, 1 skipped |
| `pnpm exec eslint src/options/components/WebsiteList/WebsiteList.tsx` | PASS; TSX проверен явно |
| `pnpm build` | PASS, dev bundle и ZIP собраны заново |
| `pnpm release` | PASS, release bundle и ZIP собраны заново |
| `node /tmp/website-blocker-core-qa.cjs` | Все 12 групп runtime assertions прошли |
| `node /tmp/website-blocker-storage-qa.cjs` | Выполнено сравнение current/HEAD; подтверждены B1–B3 ниже |
| `node /tmp/website-blocker-delete-warning.cjs` | Подтверждена новая регрессия B4; HEAD без этого warning |

Пропущенный штатный тест: `tests/deploy/release.test.ts:113`, `it.runIf(GECKO_ID)` для Firefox package; у проекта не задан Gecko ID. Это существующее условное исключение, не пропуск проверки timed blocking.

Release выдал три webpack performance warnings: превышение рекомендуемого размера assets/entrypoints и рекомендацию разделения bundles. Размеры: options 998 KiB, popup 428 KiB, blocked 385 KiB, ZIP 452 KiB. Ошибок сборки нет. В S намеренно внедрялись Promise rejection; сообщения об этих инъекциях отделены от обычных UI flows.

## Результат каждого случая

PASS ниже означает успех в явно указанной среде; обязательные native проверки имеют отдельный неполный статус.

| ID | Статус | Выполнение и evidence |
| --- | --- | --- |
| QA-01 | PASS | B: актуальные check, explicit TSX lint, dev/release builds, версия/permissions/ZIP проверены. Warnings и skip перечислены выше. |
| QA-02 | PASS | U+C: пустой список, default Indefinitely, Add `example.com`, повторное открытие; `{hostname}` без blockedUntil сохраняется. |
| QA-03 | PASS | U+C: 15/30/60 дают соответственно 900000/1800000/3600000 ms. До Add записи нет. Локальная дата и время в строке соответствуют deadline. |
| QA-04 | PASS | U+C: custom 1/7/1440 дают 60000/420000/86400000 ms; повторное чтение и reload сохраняют timestamp. |
| QA-05 | PASS | C + штатный background test: один загруженный cached block, navigation callback на deadline−1 ms блокирует, на deadline и +1 ms разрешает; storage не менялся, дополнительного read нет. Это симуляция navigation API. |
| QA-06 | PASS | U: custom1 исчез при открытых settings; отдельная 15s fixture исчезла, остальные строки сохранились. C: на следующем управляемом tick после expiry остаётся permanent; ещё 60 ticks дают 0 reads/0 writes. |
| QA-07 | BLOCKED | Нет изолированного установленного расширения для фактической одной минуты с закрытыми options. C подтверждает решение cached worker без options, но это не заменяет требуемый native сценарий. |
| QA-08 | PARTIAL | C и штатные tests: новый background module на 0/30/60/60.001 sec использует прежний deadline, не пишет storage; timed разрешён на/после expiry, permanent блокируется. Native suspension/resume не выполнен. |
| QA-09 | BLOCKED | Перезапуск изолированного браузера с установленным расширением не выполнен. Reload U и новый JS module не засчитаны как browser restart. |
| QA-10 | PASS | C: legacy `{hostname}`, active timed, expired и boundary записи; read фильтрует без writes, Add убирает expired из persisted map и сохраняет все active deadlines. |
| QA-11 | PASS | U+C: duplicate permanent/timed, включая `https://www.../path`, даёт понятную ошибку, 0 writes, исходный timestamp не меняется. |
| QA-12 | PASS | C: ровно на expiry и через 1 ms после него повторное добавление timed/permanent проходит. U: expired fixture повторно добавлена на 1 минуту с новым deadline. |
| QA-13 | PASS | U: Delete удаляет только выбранную строку; reload/state сохраняются. C: удалены timed и permanent, после simulated storage event worker перестаёт redirect для них; остальные данные сохранены. Native navigation не заявляется. |
| QA-14 | PASS | U+C: mixed permanent/timed, независимые expiry, re-add и Delete не меняют остальные deadlines; истёкшая запись не блокируется. |
| QA-15 | PARTIAL | U: empty/0/−1/1.5/нечисловой ввод отклонены браузером; большое целое — `Duration is too long.`; `1e1` принято как 10 минут. C: NaN/±Infinity/unsafe и вне Date range отклонены, 0 writes; максимальная допустимая целая длительность проходит. Нечисловой текст проверен вводом, отдельная операция paste не выполнялась. |
| QA-16 | PASS | U+C: empty/whitespace/malformed без writes; mixed-case full URL с path и www нормализуется в `mixed.example.com`. Existing getHostname не изменён. |
| QA-17 | PARTIAL | U: переключения presets/custom/indefinite, custom7 сохраняется при уходе и возврате, indefinite добавляется без custom deadline; Enter создаёт 7-минутный блок. Переключение со специально невалидного custom value и последующий submit другого режима отдельно не выполнены. |
| QA-18 | PASS | U: double-click Add и Delete при 15s задержке storage; ровно 1 write, поля/кнопки disabled, `Adding...`/`Deleting...`, затем правильный список и восстановленные controls. |
| QA-19 | PARTIAL | S: два SettingsStore и worker получают simulated change; Add появляется в обоих, Delete исчезает, решение worker совпадает. Нативные события между двумя extension pages не проверены. |
| QA-20 | FAIL | S: options request guard PASS, старый read не затирает новый. Background guard отсутствует: поздний snapshot возвращает удалённый блок и убирает новый из cache — B2, существовал в HEAD. |
| QA-21 | FAIL | S: два writers читают один snapshot; add/add теряет сайт, add/delete теряет новый либо восстанавливает удалённый — B1, существовал в HEAD. |
| QA-22 | FAIL | S: options initial/read/add-write/delete-write errors передаются вызывающему коду; storage не теряется, retries восстанавливают state. Background после initial read error повторно отвергает navigation без retry — B3, существовал в HEAD. UI-показ именно injected storage errors отдельно не проверен. |
| QA-23 | PARTIAL | S: 5 watch/dispose циклов дают 1 timer/listener при подписке и 0 после; late rejection не вызывает onError; после reopen late success не затирает новый snapshot. Полный React mount/unmount с pending operation в браузере не воспроизводился. |
| QA-24 | PASS | S + штатные tests: navigation ждёт initial load; затем только top-level active matching host redirect. Unrelated host/subframe/prerender проходят. Это runtime model обработчика, не native webNavigation event stream. |
| QA-25 | PASS | C: 7 минут через UTC midnight; отображение UTC/Nicosia/Los Angeles/Tokyo различается, deadline одинаков. Прыжок изолированного Date вперёд на сутки разрешает сайт, timestamp не меняется. Системные часы не менялись. |
| QA-26 | PARTIAL | U: 1280px и 320×900; hostname с двумя 63-символьными labels переносится, Delete не обрезан, custom поля/ошибки/pending states читаемы; date+time видимы, labels связаны, Tab Website→duration→minutes→Add и focus ring работают. Состояние намеренно задержанного initial load отдельно не осматривалось. |
| QA-27 | FAIL | U+W: новый MobX warning на обычном Delete — B4. Add/валидация без uncaught errors; также S фиксирует unhandled initial worker rejection из B3 при намеренной инъекции. |
| QA-28 | PARTIAL | U: popup и blocked page отображаются, settings action вызывает mock openOptionsPage. Close в IAB не закрыл tab; native window.close здесь не доказан. C/S подтверждают неизменную нормализацию и scope; native popup/blocked actions требуют extension environment. |
| QA-29 | BLOCKED | Нет заранее доступного изолированного signed-in окружения с синхронизацией. Личные аккаунты/устройства не использовались. |

## Подтверждённые дефекты

### B1 — P1: одновременные изменения теряют или восстанавливают блокировки

**Существовал в HEAD.** Файлы: `src/common/websites.ts:28`, `:43`, `:47–49`. Среда S: два независимых контекста, общая управляемая storage, каждый get получает отдельную копию snapshot.

Воспроизведение:

1. Начать с пустого списка; задержать завершение get в двух контекстах.
2. A вызывает Add `a.example.com` на 30 минут, B — Add `b.example.com` на 60 минут. Оба get уже прочитали `{}`.
3. Разрешить read A и запись, затем read B и запись.

Ожидание: обе успешные операции сохраняют оба сайта. Факт: записи `{a}`, затем `{b}`; итог — только `b.example.com`, обе операции успешно завершаются.

Дополнительные воспроизведённые варианты из `{old.example.com}`: Add new + Delete old при записи A→B оставляет `{}` и теряет new; при записи B→A оставляет `{old,new}` и восстанавливает old.

Влияние: пользователь может получить успешно завершённый Add, который исчезнет из списка и перестанет блокировать сайт, либо увидеть возвращённый удалённый сайт. Причина — read/modify/write всей карты без объединения конкурирующих изменений. Реальная частота в Chrome не измерялась.

Evidence: S JSON `working add-add`, `working add-delete`, `working delete-add` и такие же строки `HEAD ...`; ожидаемые/фактические lists и все writes сохранены. Для HEAD воспроизведение использует permanent записи, так как timed blocking там отсутствует.

### B2 — P1: старый background read заменяет актуальный список

**Существовал в HEAD.** Файл: `src/background/background.ts:23–26`. Среда S, детерминированный порядок завершения storage promises.

Воспроизведение:

1. Worker начинает read R1 со snapshot `{old.example.com}`; задержать ответ.
2. Storage меняется на `{new.example.com}`, событие запускает R2.
3. Завершить R2; navigation new вызывает redirect.
4. Завершить R1 старым snapshot; снова вызвать navigation new, затем old.

Ожидание: new блокируется, удалённый old доступен. Факт: new больше не redirect, old снова redirect. Persisted storage всё ещё `{new}`; повреждён только cache worker, до следующего успешного refresh/restart.

Влияние: интерфейс/сохранённый список и фактическое решение обработчика расходятся. Evidence S: current и HEAD дают `newBlockedBefore=true`, `newBlockedAfter=false`, `deletedOldBlocked=true`. Нативный порядок Chrome get responses не измерялся.

Положительный результат: для options такое же расписание теперь проходит благодаря `loadRequest` в `SettingsStore.ts:28–36`; на HEAD options тоже возвращал старый список.

### B3 — P2: transient read error оставляет worker с rejected initialization

**Существовал в HEAD.** Файлы: `src/background/background.ts:23–27`, `:34–35`, `:60–66`. Среда S, одно намеренно отклонённое storage.get.

Воспроизведение:

1. Сохранить permanent `old.example.com` и отклонить только первоначальный get с `Error('injected worker read')`.
2. Вернуть нормальное поведение get.
3. Вызвать navigation заблокированного host и затем другого host.
4. Отправить storage change и повторить navigation заблокированного host.

Ожидание: ошибка обработана, восстановившееся storage позволяет worker вернуться к работе. Факт: async init даёт unhandled rejection; следующие navigation await тот же rejected promise и тоже reject, без повторного get и redirect. После нового storage event успешный read возвращает блокировку. Другой успешный вызов initialization/worker restart также может инициировать новый read; этого конкретного пути восстановления ошибка-инъекция не проверяла.

Влияние: при transient сбое все блокировки могут не действовать до следующего refresh. Evidence S для current/HEAD: один unhandled error, два navigationErrors, `redirectsBeforeRecovery=0`, `redirectsAfterRecovery=1`. Это результат искусственного отказа API, не наблюдавшийся spontaneous сбой реального browser storage.

### B4 — P3: при Delete появился MobX warning

**Новая регрессия.** Файлы: `src/options/components/WebsiteList/WebsiteList.tsx:146`, `src/options/stores/settings-store/SettingsStore.ts:89–90`. Настройка `observableRequiresReaction: true` существовала ранее в `src/options/stores/root-store/RootStore.ts:11`.

Воспроизведение:

1. Открыть dev options UI с сохранённым сайтом и консолью.
2. Нажать Delete у строки.

Ожидание: строка удаляется без MobX warnings. Факт: удаление проходит, но появляется `[mobx] Observable 'SettingsStore@2.websites.<hostname>.hostname' being read outside a reactive context.` В U воспроизведено трижды, включая обычный mixed-list Delete и delayed Delete.

Причина: callback теперь читает observable `website.hostname` вне reactive render. HEAD websitesList возвращал строки, и callback передавал строку без такого чтения. W независимо исполняет текущий и HEAD store с конфигурацией RootStore: захватывает row в autorun, затем выполняет ровно это чтение вне reaction. Current выдаёт warning, HEAD — `warnings: []`; deleteArgument в обоих случаях корректен.

Влияние ограничено предупреждением консоли в dev-сборке; потеря данных и отказ удаления не обнаружены. Не подтверждено, что warning печатается в production-сборке. Evidence: U console-warn events, W JSON/current-vs-HEAD.

## Ограничения, наблюдения и завершение

- Доступный внешний CUA browser — Brave с профилем `Personal`. Отдельного профиля с установленным тестовым расширением и инструментами его lifecycle не было; личные настройки/данные не использовались. Native QA-07/09/29 заблокированы; native части QA-08/19/28 и browser lifecycle часть QA-23 остаются непроверенными.
- Нормальный UI и browser validation проверены фактически; injected read/write errors — в модели store. UI-показ каждого injected storage error остаётся отдельной незавершённой частью QA-22.
- Нечисловой custom value проверен набором текста; отдельный paste не выполнен. Это небольшой пробел метода QA-15, остальные перечисленные категории покрыты UI/API.
- В QA-17 не выполнен отдельный submit после скрытия невалидного custom value; в QA-26 не осматривался намеренно задержанный initial loading state. Остальные описанные UI проверки прошли.
- Close на mocked blocked page не закрывает IAB tab. Это наблюдение о harness; дефект расширения не заявляется, поскольку `window.close()` зависит от настоящего browser context. Код blocked page не изменялся.
- Не проверялись немедленное закрытие уже открытых сайтов, wildcard subdomains, автоматический возврат с blocked page и запрет досрочного Delete: они явно вне acceptance scope.
- Временные harness/evidence созданы только под `/tmp`; временных тестов в репозиторий не добавляли. Незакоммиченные `tests/common/` и `tests/background/` существовали до QA и сохранены. План не изменён.
- Сервер UI fixture остановлен; три созданные IAB вкладки закрыты, viewport override восстановлен.

До признания расширения полностью проверенным нужно устранить или явно принять B1–B3, исправить/принять B4 и выполнить отмеченные native проверки в изолированном extension environment. Отчёт фиксирует все 29 QA-ID и подтверждённые находки; это не заявление, что все 29 прошли.
