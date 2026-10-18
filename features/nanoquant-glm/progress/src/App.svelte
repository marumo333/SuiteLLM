<script>
  import { onMount } from 'svelte'
  import { parseTasks } from './parse-tasks.js'

  let sections = $state([])
  let filter = $state('all')
  let error = $state('')
  let loadedAt = $state('')
  let loading = $state(true)

  const filters = [
    { id: 'all', label: 'すべて' },
    { id: 'open', label: '未完了' },
    { id: 'done', label: '完了' }
  ]

  async function load() {
    loading = true
    error = ''
    try {
      const res = await fetch(`/tasks.md?t=${Date.now()}`, { cache: 'no-store' })
      if (!res.ok) throw new Error(String(res.status))
      sections = parseTasks(await res.text())
      loadedAt = new Date().toLocaleString('ja-JP', { hour12: false })
    } catch {
      error = 'tasks.md を読めませんでした'
      sections = []
    } finally {
      loading = false
    }
  }

  onMount(load)

  let items = $derived(sections.flatMap((section) => section.items))
  let doneCount = $derived(items.filter((item) => item.done).length)
  let total = $derived(items.length)
  let ratio = $derived(total === 0 ? 0 : doneCount / total)
  let impl = $derived(sections.find((section) => section.title === '実装')?.items ?? [])
  let design = $derived(sections.find((section) => section.title === '設計')?.items ?? [])
  let nextDecision = $derived(design.find((item) => !item.done) ?? null)

  let stages = $derived.by(() => {
    const estimateDone = impl.some((item) => item.done && item.text.includes('見積もり'))
    const matrixOpen = impl.some(
      (item) => !item.done && (item.text.includes('4096') || item.text.includes('one-matrix') || item.text.includes('再構成'))
    )
    const matrixDone = impl.some((item) => item.done && item.text.includes('one-matrix'))
    const packOpen = impl.some((item) => !item.done && item.text.includes('パック'))
    return [
      { name: '格納量', state: estimateDone ? '完了' : '未着手' },
      { name: '1 行列', state: matrixOpen ? '作業中' : matrixDone ? '完了' : '待ち' },
      { name: 'パック', state: packOpen ? '待ち' : impl.length > 0 ? '完了' : '待ち' }
    ]
  })

  function visible(section) {
    return section.items.filter((item) => {
      if (filter === 'open') return !item.done
      if (filter === 'done') return item.done
      return true
    })
  }

  function countLabel(list) {
    const done = list.filter((item) => item.done).length
    return `${done} / ${list.length}`
  }

  function groupLabel(section, rows) {
    if (filter === 'open') return `未完了 ${rows.length} / ${section.items.length}`
    if (filter === 'done') return `完了 ${rows.length} / ${section.items.length}`
    return countLabel(section.items)
  }
</script>

<main>
  <header>
    <div>
      <p class="kicker">ガードレールを外した GLM-5.3-Flash · NanoQuant</p>
      <h1>nanoquant-glm の進捗</h1>
      <p class="source">正本は <code>features/nanoquant-glm/tasks.md</code>。画面用の別リストは持たない。</p>
    </div>
    <p class="tally">
      <span class="tally-done">{doneCount}</span>
      <span class="tally-rest">/ {total} 完了</span>
    </p>
  </header>

  {#if loading}
    <p class="status">tasks.md を読んでいます。</p>
  {:else if error}
    <p class="status" role="alert">{error}</p>
  {:else}
    <div class="meter" aria-hidden="true">
      <span style:width="{ratio * 100}%"></span>
    </div>
    <p class="meter-label">{Math.round(ratio * 100)}%。実装 {countLabel(impl)}、設計 {countLabel(design)}。</p>

    <ol class="stages">
      {#each stages as stage, index}
        <li class:current={stage.state === '作業中'} class:done={stage.state === '完了'}>
          <span class="stage-index">{index + 1}</span>
          <span class="stage-name">{stage.name}</span>
          <span class="stage-state">{stage.state}</span>
        </li>
      {/each}
    </ol>

    {#if nextDecision}
      <section class="next" aria-labelledby="next-title">
        <p id="next-title">いま決める</p>
        <h2>{nextDecision.text}</h2>
      </section>
    {/if}

    <div class="toolbar">
      <div class="filters" role="group" aria-label="絞り込み">
        {#each filters as entry}
          <button type="button" aria-pressed={filter === entry.id} onclick={() => (filter = entry.id)}>
            {entry.label}
          </button>
        {/each}
      </div>
      <button type="button" class="reload" onclick={load}>読み直す</button>
      <p class="loaded">読んだ時刻 {loadedAt}</p>
    </div>

    {#each sections as section}
      {@const rows = visible(section)}
      <section class="group" aria-labelledby="group-{section.title}">
        <div class="group-head">
          <h2 id="group-{section.title}">{section.title}</h2>
          <p>{groupLabel(section, rows)}</p>
        </div>
        {#if rows.length === 0}
          <p class="empty">この絞り込みでは 0 件。</p>
        {:else}
          <ol>
            {#each rows as item}
              <li class:done={item.done}>
                <span class="mark">{item.done ? '完了' : '未完了'}</span>
                <p>{item.text}</p>
              </li>
            {/each}
          </ol>
        {/if}
      </section>
    {/each}
  {/if}
</main>

<style>
  :global(body) {
    margin: 0;
    background: #f3f0e8;
    color: #1c1915;
    font-family: 'WenQuanYi Micro Hei', 'Droid Sans Fallback', sans-serif;
  }

  main {
    max-width: 920px;
    margin: 0 auto;
    padding: 32px 24px 64px;
  }

  header {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: 24px;
  }

  .kicker {
    margin: 0 0 6px;
    color: #3f3a33;
    font-size: 13px;
    letter-spacing: 0.04em;
  }

  h1 {
    margin: 0;
    font-size: 24px;
    font-weight: 600;
    line-height: 1.3;
  }

  .source {
    margin: 8px 0 0;
    color: #3f3a33;
    font-size: 14px;
    line-height: 1.5;
  }

  code {
    font-family: ui-monospace, 'Cascadia Code', monospace;
    font-size: 13px;
  }

  .tally {
    margin: 0;
    white-space: nowrap;
  }

  .tally-done {
    font-size: 40px;
    font-weight: 600;
    line-height: 1;
  }

  .tally-rest {
    color: #3f3a33;
    font-size: 16px;
  }

  .status {
    margin-top: 28px;
    font-size: 16px;
  }

  .meter {
    margin-top: 22px;
    height: 8px;
    background: #ddd6c8;
  }

  .meter span {
    display: block;
    height: 100%;
    background: #1f6b45;
  }

  .meter-label {
    margin: 8px 0 0;
    color: #3f3a33;
    font-size: 14px;
  }

  .stages {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
    margin: 22px 0 0;
    padding: 0;
    list-style: none;
  }

  .stages li {
    display: grid;
    grid-template-columns: auto 1fr;
    grid-template-rows: auto auto;
    column-gap: 10px;
    padding: 12px 14px;
    background: #fffdf8;
    border: 1px solid #ddd6c8;
  }

  .stage-index {
    grid-row: 1 / span 2;
    align-self: center;
    color: #3f3a33;
    font-size: 20px;
  }

  .stage-name {
    font-size: 16px;
  }

  .stage-state {
    color: #3f3a33;
    font-size: 13px;
  }

  .stages li.done .stage-state {
    color: #1f6b45;
  }

  .stages li.current {
    border-color: #1c1915;
  }

  .stages li.current .stage-state {
    color: #1c1915;
    font-weight: 600;
  }

  .next {
    margin-top: 22px;
    padding: 18px 20px;
    background: #fffdf8;
    border-left: 4px solid #1c1915;
  }

  .next p {
    margin: 0;
    color: #3f3a33;
    font-size: 13px;
  }

  .next h2 {
    margin: 6px 0 0;
    font-size: 20px;
    font-weight: 600;
    line-height: 1.45;
  }

  .toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 12px 16px;
    margin-top: 28px;
  }

  .filters {
    display: flex;
    border: 1px solid #cfc6b6;
  }

  button {
    border: 0;
    background: transparent;
    color: #1c1915;
    font: inherit;
    font-size: 14px;
    padding: 8px 14px;
    cursor: pointer;
  }

  button[aria-pressed='true'] {
    background: #1c1915;
    color: #f3f0e8;
  }

  .reload {
    border: 1px solid #cfc6b6;
    background: #fffdf8;
  }

  .loaded {
    margin: 0;
    color: #3f3a33;
    font-size: 13px;
  }

  .group {
    margin-top: 28px;
  }

  .group-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    border-bottom: 1px solid #ddd6c8;
  }

  .group-head h2 {
    margin: 0;
    font-size: 18px;
  }

  .group-head p {
    margin: 0;
    color: #3f3a33;
    font-size: 14px;
  }

  ol {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .group li {
    display: grid;
    grid-template-columns: 72px 1fr;
    gap: 12px;
    padding: 14px 0;
    border-bottom: 1px solid #e6e0d4;
  }

  .mark {
    align-self: start;
    color: #8a5a12;
    font-size: 13px;
    line-height: 1.6;
  }

  li.done .mark {
    color: #1f6b45;
  }

  li p {
    margin: 0;
    font-size: 16px;
    line-height: 1.6;
  }

  li.done p {
    color: #3f3a33;
  }

  .empty {
    margin: 12px 0 0;
    color: #3f3a33;
    font-size: 14px;
  }

  @media (max-width: 640px) {
    header {
      display: block;
    }

    .tally {
      margin-top: 16px;
    }

    .stages {
      grid-template-columns: 1fr;
    }
  }
</style>
