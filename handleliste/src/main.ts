import { el, replaceChildren } from './dom.ts';
import * as db from './lib/db.ts';
import { isCategory, type Meal, type ShoppingItem } from './lib/types.ts';
import type { Actions, AppState } from './state.ts';
import { createListView } from './views/list.ts';
import { createMealsView } from './views/meals.ts';
import { createWeekView } from './views/week.ts';

type TabId = 'liste' | 'middager' | 'uke';

const TABS: { id: TabId; label: string }[] = [
  { id: 'liste', label: 'Liste' },
  { id: 'middager', label: 'Middager' },
  { id: 'uke', label: 'Uke' },
];

const root = document.querySelector<HTMLDivElement>('#app');
if (root === null) throw new Error('Fant ikke #app');

if (!db.isConfigured) {
  renderSetupHelp(root);
} else {
  void start(root);
}

async function start(container: HTMLElement): Promise<void> {
  const state: AppState = { items: [], meals: [], week: [] };
  let tab: TabId = 'liste';

  const actions: Actions = {
    addManual: (input) =>
      run(() =>
        db.addManualItem({
          name: input.name,
          amount: input.amount,
          unit: input.unit,
          category: isCategory(input.category) ? input.category : 'annet',
        }),
      ),
    toggleChecked: (item: ShoppingItem) => run(() => db.setChecked(item.id, !item.checked)),
    removeItem: (item: ShoppingItem) => run(() => db.removeItem(item.id)),
    removeChecked: () => run(() => db.removeCheckedItems()),
    clearList: () => {
      if (!confirm('Tømme hele handlelista?')) return;
      run(() => db.clearList());
    },
    toggleWeekMeal: (meal: Meal) => {
      const inWeek = state.week.some((entry) => entry.meal_id === meal.id);
      run(() => (inWeek ? db.removeMealFromWeek(meal.id) : db.addMealToWeek(meal.id)));
    },
    addWeekToList: () =>
      run(async () => {
        const byId = new Map(state.meals.map((meal) => [meal.id, meal]));
        const pending = state.week
          .filter((entry) => !entry.added_to_list)
          .map((entry) => byId.get(entry.meal_id))
          .filter((meal): meal is Meal => meal !== undefined);
        if (pending.length === 0) return;

        const added = await db.addMealsToList(pending);
        await db.markWeekMealsAdded(pending.map((meal) => meal.id));
        setTab('liste');
        showStatus(`${added.length} varer lagt til fra ${pending.length} middager`);
      }),
    clearWeek: () => run(() => db.clearWeek()),
    goToList: () => setTab('liste'),
  };

  const views = {
    liste: createListView(actions),
    middager: createMealsView(actions),
    uke: createWeekView(actions),
  } as const;

  const status = el('div', { class: 'status', attrs: { role: 'status' } });
  const content = el('main', { class: 'content' });
  const tabBar = el(
    'nav',
    { class: 'tabs' },
    TABS.map((entry) =>
      el('button', {
        class: 'tab',
        text: entry.label,
        attrs: { type: 'button', 'data-tab': entry.id },
        on: { click: () => setTab(entry.id) },
      }),
    ),
  );

  replaceChildren(container, [
    el('header', { class: 'app-header' }, [el('h1', { text: 'Handleliste' }), status]),
    content,
    tabBar,
  ]);

  let statusTimer: number | undefined;
  function showStatus(message: string, isError = false): void {
    status.textContent = message;
    status.classList.toggle('error', isError);
    window.clearTimeout(statusTimer);
    statusTimer = window.setTimeout(() => {
      status.textContent = '';
      status.classList.remove('error');
    }, isError ? 8000 : 3000);
  }

  function setTab(next: TabId): void {
    tab = next;
    for (const button of tabBar.querySelectorAll('.tab')) {
      button.classList.toggle('active', button.getAttribute('data-tab') === tab);
    }
    replaceChildren(content, [views[tab].element]);
    views[tab].update(state);
    content.scrollTo({ top: 0 });
  }

  function refreshView(): void {
    views[tab].update(state);
  }

  /**
   * Kjører en handling og henter deretter alt på nytt. Realtime varsler den
   * andre telefonen; denne refetchen er for vår egen, som ikke får sitt eget
   * postgres_changes-kall garantert før neste tegning.
   */
  function run(action: () => Promise<unknown>): void {
    void (async () => {
      try {
        await action();
        await reload();
      } catch (error) {
        showStatus(error instanceof Error ? error.message : 'Noe gikk galt', true);
      }
    })();
  }

  async function reload(): Promise<void> {
    const [items, week] = await Promise.all([db.fetchList(), db.fetchWeekPlan()]);
    state.items = items;
    state.week = week;
    refreshView();
  }

  setTab('liste');

  try {
    state.meals = await db.fetchMeals();
    await reload();
  } catch (error) {
    showStatus(error instanceof Error ? error.message : 'Klarte ikke å hente data', true);
    return;
  }

  // Realtime: den andre telefonen sin endring lander her.
  db.subscribeToChanges(() => {
    void reload().catch(() => showStatus('Mistet kontakt med databasen', true));
  });
}

function renderSetupHelp(container: HTMLElement): void {
  replaceChildren(container, [
    el('header', { class: 'app-header' }, [el('h1', { text: 'Handleliste' })]),
    el('main', { class: 'content' }, [
      el('section', { class: 'view setup' }, [
        el('h2', { text: 'Mangler Supabase-oppsett' }),
        el('p', {
          text:
            'Lag et gratis prosjekt på supabase.com, kjør SQL-filene i supabase/-mappa, ' +
            'og legg nøklene i en .env-fil ved siden av package.json:',
        }),
        el('pre', { text: 'VITE_SUPABASE_URL=https://xxxx.supabase.co\nVITE_SUPABASE_ANON_KEY=eyJ...' }),
        el('p', { text: 'Start deretter dev-serveren på nytt.' }),
      ]),
    ]),
  ]);
}
