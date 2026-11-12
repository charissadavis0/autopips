// Tabs
document.querySelectorAll('.tab').forEach(btn => {
  btn.addEventListener('click', () => {
    const group = btn.closest('[data-tabs]') || btn.closest('.tabs').parentElement
    const target = btn.dataset.tab
    group.querySelectorAll('.tab').forEach(t => t.classList.remove('active'))
    group.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'))
    btn.classList.add('active')
    const panel = group.querySelector(`.tab-panel[data-tab="${target}"]`)
    if (panel) panel.classList.add('active')
  })
})

// FAQ accordion
document.querySelectorAll('.faq-q').forEach(btn => {
  btn.addEventListener('click', () => {
    const answer = btn.nextElementSibling
    const isOpen = answer.classList.contains('open')
    document.querySelectorAll('.faq-a').forEach(a => a.classList.remove('open'))
    document.querySelectorAll('.faq-q').forEach(b => b.querySelector('.faq-arrow') && (b.querySelector('.faq-arrow').textContent = '+'))
    if (!isOpen) {
      answer.classList.add('open')
      const arrow = btn.querySelector('.faq-arrow')
      if (arrow) arrow.textContent = '−'
    }
  })
})

// Copy to clipboard
document.querySelectorAll('[data-copy]').forEach(btn => {
  btn.addEventListener('click', () => {
    const text = btn.dataset.copy
    navigator.clipboard.writeText(text).then(() => {
      const orig = btn.textContent
      btn.textContent = 'Copied!'
      setTimeout(() => { btn.textContent = orig }, 1500)
    })
  })
})

// Scroll reveal
const revealEls = document.querySelectorAll('.reveal')
if (revealEls.length) {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible') })
  }, { threshold: 0.1 })
  revealEls.forEach(el => observer.observe(el))
}

// Modal open/close
document.querySelectorAll('[data-modal-open]').forEach(btn => {
  btn.addEventListener('click', () => {
    const modal = document.getElementById(btn.dataset.modalOpen)
    if (modal) modal.classList.remove('hidden')
  })
})
document.querySelectorAll('[data-modal-close]').forEach(btn => {
  btn.addEventListener('click', () => {
    const modal = btn.closest('.modal-backdrop')
    if (modal) modal.classList.add('hidden')
  })
})
document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
  backdrop.addEventListener('click', e => {
    if (e.target === backdrop) backdrop.classList.add('hidden')
  })
})

// Notifications panel
(function() {
  const btn = document.getElementById('notifBtn')
  const panel = document.getElementById('notifPanel')
  const dot = document.getElementById('notifDot')
  const list = document.getElementById('notifList')
  const markAll = document.getElementById('notifMarkAll')
  if (!btn || !panel) return

  let loaded = false

  function timeAgo(dateStr) {
    const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000)
    if (diff < 60) return 'Just now'
    if (diff < 3600) return Math.floor(diff/60) + 'm ago'
    if (diff < 86400) return Math.floor(diff/3600) + 'h ago'
    return Math.floor(diff/86400) + 'd ago'
  }

  function renderNotifs(notifs) {
    if (!notifs.length) {
      list.innerHTML = '<div style="padding:24px;text-align:center;color:var(--text3);font-size:.875rem">No notifications yet</div>'
      return
    }
    list.innerHTML = notifs.map(n => `
      <div style="display:flex;gap:10px;padding:12px 16px;border-bottom:1px solid var(--border);${!n.read ? 'background:rgba(59,110,246,.04)' : ''}">
        <div style="width:7px;height:7px;border-radius:50%;background:${n.read ? 'var(--border2)' : 'var(--brand)'};flex-shrink:0;margin-top:6px"></div>
        <div style="flex:1">
          <div style="font-weight:${n.read ? '500' : '600'};color:${n.read ? 'var(--text)' : '#fff'};font-size:.8125rem;margin-bottom:2px">${n.title}</div>
          <div style="font-size:.78rem;color:var(--text2)">${n.message}</div>
          <div style="font-size:.7rem;color:var(--text3);margin-top:3px">${timeAgo(n.created_at)}</div>
        </div>
      </div>`).join('')
  }

  async function loadNotifs() {
    try {
      const r = await fetch('/notifications/data')
      const data = await r.json()
      renderNotifs(data.notifications || [])
      dot.style.display = data.unread > 0 ? 'block' : 'none'
      loaded = true
    } catch(e) {}
  }

  btn.addEventListener('click', e => {
    e.stopPropagation()
    const open = panel.style.display === 'block'
    panel.style.display = open ? 'none' : 'block'
    document.getElementById('notifPanel') && document.getElementById('notifPanel').style.display !== 'none' && !loaded && loadNotifs()
  })

  markAll && markAll.addEventListener('click', async () => {
    await fetch('/notifications/read-all', { method: 'POST' })
    dot.style.display = 'none'
    loadNotifs()
  })

  document.addEventListener('click', e => {
    if (!btn.contains(e.target) && !panel.contains(e.target)) panel.style.display = 'none'
  })

  // Check unread count on load
  fetch('/notifications/data').then(r => r.json()).then(d => { if (d.unread > 0) dot.style.display = 'block' }).catch(()=>{})
})()

// Topbar dropdown close on outside click
document.addEventListener('click', e => {
  const dropdown = document.querySelector('.topbar-dropdown')
  const user = document.querySelector('.topbar-user')
  if (dropdown && !dropdown.contains(e.target) && !user?.contains(e.target)) {
    dropdown.classList.remove('open')
  }
})

// Flash auto-dismiss
document.querySelectorAll('.alert[data-dismiss]').forEach(el => {
  setTimeout(() => el.style.display = 'none', parseInt(el.dataset.dismiss) || 4000)
})

// Confirm before destructive form submit
document.querySelectorAll('form[data-confirm]').forEach(form => {
  form.addEventListener('submit', e => {
    if (!confirm(form.dataset.confirm)) e.preventDefault()
  })
})
