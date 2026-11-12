/**
 * AutoPips i18n — global translations engine.
 * Add data-i18n="key" to any element to have it translated.
 * Translations auto-apply on load based on localStorage or browser language.
 */
;(function () {
  const LANGS = {
    en: {
      // Sidebar sections
      'section-business': 'My Business',
      'section-discover': 'Discover',
      'section-studio': 'AI Studio',
      'section-growth': 'Growth',
      'section-financials': 'Financials',
      'section-account': 'Account',
      'section-admin': 'Admin',
      // Sidebar links
      'nav-overview': 'Overview',
      'nav-launch': 'Launch My Business',
      'nav-stores': 'My Stores',
      'nav-products-mine': 'My Products',
      'nav-orders': 'My Orders',
      'nav-autopips': 'Autopips',
      'nav-import': 'Import Products',
      'nav-strategies': 'Strategies',
      'nav-experts': 'Expert Advisors',
      'nav-agents': 'Find an Agent',
      'nav-video': 'AI Video Studio',
      'nav-content': 'AI Content',
      'nav-images': 'AI Images',
      'nav-social': 'Social Media',
      'nav-ads': 'Advertising',
      'nav-seo': 'SEO Services',
      'nav-wallet': 'AI Wallet',
      'nav-transactions': 'Transactions',
      'nav-payout': 'Payout Settings',
      'nav-notifications': 'Notifications',
      'nav-settings': 'Settings',
      'nav-signout': 'Sign out',
      // Admin links
      'nav-admin': 'Admin Panel',
      'nav-users': 'Users',
      'nav-deposits': 'Deposit Requests',
      'nav-withdrawals': 'Withdrawals',
      'nav-catalog': 'Catalog',
      'nav-audit': 'Audit Log',
      // Topbar
      'topbar-balance': 'Balance',
      'topbar-signout': 'Sign Out',
      'topbar-admin': 'Admin Panel',
      'topbar-settings': 'Settings',
      'topbar-markread': 'Mark all read',
      'topbar-view-notifs': 'View all notifications',
      // Landing
      'nav-home': 'Home', 'nav-about': 'About', 'nav-products': 'Products',
      'nav-platform': 'Platform', 'nav-education': 'Education', 'nav-accounts': 'Accounts',
      'nav-login': 'Log in', 'nav-open': 'Open Account',
      'hero-title': 'Build and Scale Your Dropshipping Business <span class="grad-text">with AI Precision.</span>',
      'hero-sub': 'Unlock unlimited growth with an intelligent platform built for speed, automation, and profit. Discover products, build storefronts, manage orders, and withdraw earnings — all in one place.',
      'btn-start': 'Start Selling Today →', 'btn-explore': 'Explore Products',
      'hero-rating': '4.9/5 from 12,000+ active sellers worldwide',
      'hero-tagline': 'Source 50,000+ winning products across global markets',
      // Common
      'lbl-soon': 'Soon',
    },
    es: {
      'section-business': 'Mi Negocio',
      'section-discover': 'Descubrir',
      'section-studio': 'Estudio IA',
      'section-growth': 'Crecimiento',
      'section-financials': 'Finanzas',
      'section-account': 'Cuenta',
      'section-admin': 'Administración',
      'nav-overview': 'Resumen',
      'nav-launch': 'Lanzar mi Negocio',
      'nav-stores': 'Mis Tiendas',
      'nav-products-mine': 'Mis Productos',
      'nav-orders': 'Mis Pedidos',
      'nav-autopips': 'Autopips',
      'nav-import': 'Importar Productos',
      'nav-strategies': 'Estrategias',
      'nav-experts': 'Asesores Expertos',
      'nav-agents': 'Encontrar un Agente',
      'nav-video': 'Estudio de Video IA',
      'nav-content': 'Contenido IA',
      'nav-images': 'Imágenes IA',
      'nav-social': 'Redes Sociales',
      'nav-ads': 'Publicidad',
      'nav-seo': 'Servicios SEO',
      'nav-wallet': 'Billetera IA',
      'nav-transactions': 'Transacciones',
      'nav-payout': 'Config. de Pagos',
      'nav-notifications': 'Notificaciones',
      'nav-settings': 'Configuración',
      'nav-signout': 'Cerrar sesión',
      'nav-admin': 'Panel de Admin',
      'nav-users': 'Usuarios',
      'nav-deposits': 'Solicitudes de Depósito',
      'nav-withdrawals': 'Retiros',
      'nav-catalog': 'Catálogo',
      'nav-audit': 'Registro de Auditoría',
      'topbar-balance': 'Saldo',
      'topbar-signout': 'Cerrar Sesión',
      'topbar-admin': 'Panel de Admin',
      'topbar-settings': 'Configuración',
      'topbar-markread': 'Marcar todo como leído',
      'topbar-view-notifs': 'Ver todas las notificaciones',
      'nav-home': 'Inicio', 'nav-about': 'Acerca de', 'nav-products': 'Productos',
      'nav-platform': 'Plataforma', 'nav-education': 'Educación', 'nav-accounts': 'Cuentas',
      'nav-login': 'Iniciar sesión', 'nav-open': 'Abrir Cuenta',
      'hero-title': 'Construye y Escala tu Negocio de Dropshipping <span class="grad-text">con Precisión de IA.</span>',
      'hero-sub': 'Desbloquea un crecimiento ilimitado con una plataforma inteligente diseñada para velocidad, automatización y ganancias. Descubre productos, crea tiendas, gestiona pedidos y retira ganancias — todo en un solo lugar.',
      'btn-start': 'Empieza a Vender Hoy →', 'btn-explore': 'Explorar Productos',
      'hero-rating': '4.9/5 de más de 12.000 vendedores activos en el mundo',
      'hero-tagline': 'Encuentra más de 50.000 productos ganadores en mercados globales',
      'lbl-soon': 'Pronto',
    },
    fr: {
      'section-business': 'Mon Commerce',
      'section-discover': 'Découvrir',
      'section-studio': 'Studio IA',
      'section-growth': 'Croissance',
      'section-financials': 'Finances',
      'section-account': 'Compte',
      'section-admin': 'Administration',
      'nav-overview': 'Aperçu',
      'nav-launch': 'Lancer mon Commerce',
      'nav-stores': 'Mes Boutiques',
      'nav-products-mine': 'Mes Produits',
      'nav-orders': 'Mes Commandes',
      'nav-autopips': 'Autopips',
      'nav-import': 'Importer des Produits',
      'nav-strategies': 'Stratégies',
      'nav-experts': 'Conseillers Experts',
      'nav-agents': 'Trouver un Agent',
      'nav-video': 'Studio Vidéo IA',
      'nav-content': 'Contenu IA',
      'nav-images': 'Images IA',
      'nav-social': 'Réseaux Sociaux',
      'nav-ads': 'Publicité',
      'nav-seo': 'Services SEO',
      'nav-wallet': 'Portefeuille IA',
      'nav-transactions': 'Transactions',
      'nav-payout': 'Paramètres de Paiement',
      'nav-notifications': 'Notifications',
      'nav-settings': 'Paramètres',
      'nav-signout': 'Se déconnecter',
      'nav-admin': 'Panneau Admin',
      'nav-users': 'Utilisateurs',
      'nav-deposits': 'Demandes de Dépôt',
      'nav-withdrawals': 'Retraits',
      'nav-catalog': 'Catalogue',
      'nav-audit': 'Journal d\'Audit',
      'topbar-balance': 'Solde',
      'topbar-signout': 'Se Déconnecter',
      'topbar-admin': 'Panneau Admin',
      'topbar-settings': 'Paramètres',
      'topbar-markread': 'Tout marquer comme lu',
      'topbar-view-notifs': 'Voir toutes les notifications',
      'nav-home': 'Accueil', 'nav-about': 'À propos', 'nav-products': 'Produits',
      'nav-platform': 'Plateforme', 'nav-education': 'Formation', 'nav-accounts': 'Comptes',
      'nav-login': 'Se connecter', 'nav-open': 'Ouvrir un Compte',
      'hero-title': 'Développez votre Activité Dropshipping <span class="grad-text">avec la Précision de l\'IA.</span>',
      'hero-sub': 'Libérez une croissance illimitée avec une plateforme intelligente conçue pour la rapidité, l\'automatisation et le profit.',
      'btn-start': 'Commencer à Vendre →', 'btn-explore': 'Explorer les Produits',
      'hero-rating': '4,9/5 de plus de 12 000 vendeurs actifs dans le monde',
      'hero-tagline': 'Sourcez plus de 50 000 produits gagnants sur les marchés mondiaux',
      'lbl-soon': 'Bientôt',
    },
    pt: {
      'section-business': 'Meu Negócio', 'section-discover': 'Descobrir', 'section-studio': 'Estúdio IA',
      'section-growth': 'Crescimento', 'section-financials': 'Finanças', 'section-account': 'Conta', 'section-admin': 'Administração',
      'nav-overview': 'Visão Geral', 'nav-launch': 'Lançar meu Negócio', 'nav-stores': 'Minhas Lojas', 'nav-products-mine': 'Meus Produtos', 'nav-orders': 'Meus Pedidos',
      'nav-autopips': 'Autopips', 'nav-import': 'Importar Produtos', 'nav-strategies': 'Estratégias', 'nav-experts': 'Consultores Especializados', 'nav-agents': 'Encontrar um Agente',
      'nav-video': 'Estúdio de Vídeo IA', 'nav-content': 'Conteúdo IA', 'nav-images': 'Imagens IA',
      'nav-social': 'Redes Sociais', 'nav-ads': 'Publicidade', 'nav-seo': 'Serviços SEO',
      'nav-wallet': 'Carteira IA', 'nav-transactions': 'Transações', 'nav-payout': 'Config. de Pagamento',
      'nav-notifications': 'Notificações', 'nav-settings': 'Configurações', 'nav-signout': 'Sair',
      'nav-admin': 'Painel Admin', 'nav-users': 'Usuários', 'nav-deposits': 'Pedidos de Depósito', 'nav-withdrawals': 'Saques', 'nav-catalog': 'Catálogo', 'nav-audit': 'Log de Auditoria',
      'topbar-balance': 'Saldo', 'topbar-signout': 'Sair', 'topbar-admin': 'Painel Admin', 'topbar-settings': 'Configurações',
      'topbar-markread': 'Marcar tudo como lido', 'topbar-view-notifs': 'Ver todas as notificações',
      'nav-home': 'Início', 'nav-about': 'Sobre', 'nav-products': 'Produtos', 'nav-platform': 'Plataforma', 'nav-education': 'Educação', 'nav-accounts': 'Contas',
      'nav-login': 'Entrar', 'nav-open': 'Abrir Conta',
      'hero-title': 'Construa e Escale seu Negócio de Dropshipping <span class="grad-text">com Precisão de IA.</span>',
      'hero-sub': 'Desbloqueie crescimento ilimitado com uma plataforma inteligente criada para velocidade, automação e lucro.',
      'btn-start': 'Comece a Vender Hoje →', 'btn-explore': 'Explorar Produtos',
      'hero-rating': '4,9/5 de mais de 12.000 vendedores ativos em todo o mundo',
      'hero-tagline': 'Encontre mais de 50.000 produtos vencedores em mercados globais',
      'lbl-soon': 'Em Breve',
    },
    de: {
      'section-business': 'Mein Geschäft', 'section-discover': 'Entdecken', 'section-studio': 'KI-Studio',
      'section-growth': 'Wachstum', 'section-financials': 'Finanzen', 'section-account': 'Konto', 'section-admin': 'Administration',
      'nav-overview': 'Übersicht', 'nav-launch': 'Mein Geschäft starten', 'nav-stores': 'Meine Shops', 'nav-products-mine': 'Meine Produkte', 'nav-orders': 'Meine Bestellungen',
      'nav-autopips': 'Autopips', 'nav-import': 'Produkte importieren', 'nav-strategies': 'Strategien', 'nav-experts': 'Expertenberater', 'nav-agents': 'Agent finden',
      'nav-video': 'KI-Videostudio', 'nav-content': 'KI-Inhalte', 'nav-images': 'KI-Bilder',
      'nav-social': 'Social Media', 'nav-ads': 'Werbung', 'nav-seo': 'SEO-Dienste',
      'nav-wallet': 'KI-Wallet', 'nav-transactions': 'Transaktionen', 'nav-payout': 'Auszahlungseinstellungen',
      'nav-notifications': 'Benachrichtigungen', 'nav-settings': 'Einstellungen', 'nav-signout': 'Abmelden',
      'nav-admin': 'Admin-Panel', 'nav-users': 'Benutzer', 'nav-deposits': 'Einzahlungsanfragen', 'nav-withdrawals': 'Auszahlungen', 'nav-catalog': 'Katalog', 'nav-audit': 'Prüfprotokoll',
      'topbar-balance': 'Guthaben', 'topbar-signout': 'Abmelden', 'topbar-admin': 'Admin-Panel', 'topbar-settings': 'Einstellungen',
      'topbar-markread': 'Alle als gelesen markieren', 'topbar-view-notifs': 'Alle Benachrichtigungen',
      'nav-home': 'Startseite', 'nav-about': 'Über uns', 'nav-products': 'Produkte', 'nav-platform': 'Plattform', 'nav-education': 'Bildung', 'nav-accounts': 'Konten',
      'nav-login': 'Anmelden', 'nav-open': 'Konto eröffnen',
      'hero-title': 'Bauen und Skalieren Sie Ihr Dropshipping-Geschäft <span class="grad-text">mit KI-Präzision.</span>',
      'hero-sub': 'Erschließen Sie unbegrenztes Wachstum mit einer intelligenten Plattform für Geschwindigkeit, Automatisierung und Gewinn.',
      'btn-start': 'Heute starten →', 'btn-explore': 'Produkte erkunden',
      'hero-rating': '4,9/5 von über 12.000 Verkäufern weltweit',
      'hero-tagline': 'Über 50.000 Produkte auf globalen Märkten',
      'lbl-soon': 'Demnächst',
    },
    ru: {
      'section-business': 'Мой Бизнес', 'section-discover': 'Обзор', 'section-studio': 'ИИ-Студия',
      'section-growth': 'Рост', 'section-financials': 'Финансы', 'section-account': 'Аккаунт', 'section-admin': 'Администрирование',
      'nav-overview': 'Обзор', 'nav-launch': 'Запустить бизнес', 'nav-stores': 'Мои магазины', 'nav-products-mine': 'Мои товары', 'nav-orders': 'Мои заказы',
      'nav-autopips': 'Autopips', 'nav-import': 'Импорт товаров', 'nav-strategies': 'Стратегии', 'nav-experts': 'Эксперты', 'nav-agents': 'Найти агента',
      'nav-video': 'ИИ-Видеостудия', 'nav-content': 'ИИ-Контент', 'nav-images': 'ИИ-Изображения',
      'nav-social': 'Соцсети', 'nav-ads': 'Реклама', 'nav-seo': 'SEO-услуги',
      'nav-wallet': 'ИИ-Кошелёк', 'nav-transactions': 'Транзакции', 'nav-payout': 'Настройки выплат',
      'nav-notifications': 'Уведомления', 'nav-settings': 'Настройки', 'nav-signout': 'Выйти',
      'nav-admin': 'Панель Admin', 'nav-users': 'Пользователи', 'nav-deposits': 'Заявки на депозит', 'nav-withdrawals': 'Выводы', 'nav-catalog': 'Каталог', 'nav-audit': 'Журнал аудита',
      'topbar-balance': 'Баланс', 'topbar-signout': 'Выйти', 'topbar-admin': 'Панель Admin', 'topbar-settings': 'Настройки',
      'topbar-markread': 'Отметить всё прочитанным', 'topbar-view-notifs': 'Все уведомления',
      'nav-home': 'Главная', 'nav-about': 'О нас', 'nav-products': 'Продукты', 'nav-platform': 'Платформа', 'nav-education': 'Обучение', 'nav-accounts': 'Аккаунты',
      'nav-login': 'Войти', 'nav-open': 'Открыть Счёт',
      'hero-title': 'Создайте и масштабируйте бизнес дропшиппинга <span class="grad-text">с точностью ИИ.</span>',
      'hero-sub': 'Откройте безграничный рост с помощью умной платформы для скорости, автоматизации и прибыли.',
      'btn-start': 'Начать продавать →', 'btn-explore': 'Смотреть продукты',
      'hero-rating': '4,9/5 от более 12 000 продавцов по всему миру',
      'hero-tagline': 'Более 50 000 продуктов на мировых рынках',
      'lbl-soon': 'Скоро',
    },
    zh: {
      'section-business': '我的业务', 'section-discover': '发现', 'section-studio': 'AI 工作室',
      'section-growth': '增长', 'section-financials': '财务', 'section-account': '账户', 'section-admin': '管理',
      'nav-overview': '概览', 'nav-launch': '启动我的业务', 'nav-stores': '我的商店', 'nav-products-mine': '我的产品', 'nav-orders': '我的订单',
      'nav-autopips': 'Autopips', 'nav-import': '导入产品', 'nav-strategies': '策略', 'nav-experts': '专家顾问', 'nav-agents': '寻找代理',
      'nav-video': 'AI 视频工作室', 'nav-content': 'AI 内容', 'nav-images': 'AI 图像',
      'nav-social': '社交媒体', 'nav-ads': '广告', 'nav-seo': 'SEO 服务',
      'nav-wallet': 'AI 钱包', 'nav-transactions': '交易记录', 'nav-payout': '提款设置',
      'nav-notifications': '通知', 'nav-settings': '设置', 'nav-signout': '退出',
      'nav-admin': '管理面板', 'nav-users': '用户', 'nav-deposits': '存款申请', 'nav-withdrawals': '提款', 'nav-catalog': '目录', 'nav-audit': '审计日志',
      'topbar-balance': '余额', 'topbar-signout': '退出', 'topbar-admin': '管理面板', 'topbar-settings': '设置',
      'topbar-markread': '全部标为已读', 'topbar-view-notifs': '查看所有通知',
      'nav-home': '首页', 'nav-about': '关于我们', 'nav-products': '产品', 'nav-platform': '平台', 'nav-education': '教育', 'nav-accounts': '账户类型',
      'nav-login': '登录', 'nav-open': '开设账户',
      'hero-title': '借助 <span class="grad-text">AI 精准技术</span>，构建并扩展您的代发货业务。',
      'hero-sub': '借助为速度、自动化和盈利而设计的智能平台，释放无限增长潜力。',
      'btn-start': '立即开始销售 →', 'btn-explore': '浏览产品',
      'hero-rating': '全球 12,000+ 活跃卖家给出 4.9/5 的评分',
      'hero-tagline': '在全球市场寻找超过 50,000 种畅销产品',
      'lbl-soon': '即将推出',
    },
    ar: {
      'section-business': 'عملي', 'section-discover': 'اكتشف', 'section-studio': 'استوديو الذكاء',
      'section-growth': 'النمو', 'section-financials': 'الماليات', 'section-account': 'الحساب', 'section-admin': 'الإدارة',
      'nav-overview': 'نظرة عامة', 'nav-launch': 'إطلاق عملي', 'nav-stores': 'متاجري', 'nav-products-mine': 'منتجاتي', 'nav-orders': 'طلباتي',
      'nav-autopips': 'Autopips', 'nav-import': 'استيراد المنتجات', 'nav-strategies': 'الاستراتيجيات', 'nav-experts': 'المستشارون الخبراء', 'nav-agents': 'إيجاد وكيل',
      'nav-video': 'استوديو الفيديو بالذكاء الاصطناعي', 'nav-content': 'محتوى الذكاء الاصطناعي', 'nav-images': 'صور الذكاء الاصطناعي',
      'nav-social': 'التواصل الاجتماعي', 'nav-ads': 'الإعلانات', 'nav-seo': 'خدمات SEO',
      'nav-wallet': 'المحفظة الذكية', 'nav-transactions': 'المعاملات', 'nav-payout': 'إعدادات الدفع',
      'nav-notifications': 'الإشعارات', 'nav-settings': 'الإعدادات', 'nav-signout': 'تسجيل الخروج',
      'nav-admin': 'لوحة الإدارة', 'nav-users': 'المستخدمون', 'nav-deposits': 'طلبات الإيداع', 'nav-withdrawals': 'السحوبات', 'nav-catalog': 'الكتالوج', 'nav-audit': 'سجل المراجعة',
      'topbar-balance': 'الرصيد', 'topbar-signout': 'تسجيل الخروج', 'topbar-admin': 'لوحة الإدارة', 'topbar-settings': 'الإعدادات',
      'topbar-markread': 'تحديد الكل كمقروء', 'topbar-view-notifs': 'عرض كل الإشعارات',
      'nav-home': 'الرئيسية', 'nav-about': 'من نحن', 'nav-products': 'المنتجات', 'nav-platform': 'المنصة', 'nav-education': 'التعليم', 'nav-accounts': 'أنواع الحسابات',
      'nav-login': 'تسجيل الدخول', 'nav-open': 'فتح حساب',
      'hero-title': 'ابنِ وطوِّر أعمالك في الدروبشيبينج <span class="grad-text">بدقة الذكاء الاصطناعي.</span>',
      'hero-sub': 'افتح آفاق نمو غير محدود مع منصة ذكية مصممة للسرعة والأتمتة والربح.',
      'btn-start': 'ابدأ البيع اليوم →', 'btn-explore': 'استعرض المنتجات',
      'hero-rating': '4.9/5 من أكثر من 12,000 بائع نشط حول العالم',
      'hero-tagline': 'تعامل مع أكثر من 50,000 منتج رابح في الأسواق العالمية',
      'lbl-soon': 'قريباً',
    },
  }

  function getSupportedLang(code) {
    if (!code) return 'en'
    const short = code.slice(0, 2).toLowerCase()
    return LANGS[short] ? short : 'en'
  }

  function getCurrentLang() {
    try { return getSupportedLang(localStorage.getItem('ap_lang') || navigator.language) } catch (_) { return 'en' }
  }

  window.applyLang = function (lang) {
    const code = getSupportedLang(lang)
    const t = LANGS[code]
    const rtl = code === 'ar'
    document.documentElement.lang = code
    document.documentElement.dir = rtl ? 'rtl' : 'ltr'
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n')
      if (t[key] !== undefined) el.innerHTML = t[key]
    })
    // Update all lang selectors to match
    document.querySelectorAll('.lang-select').forEach(s => { s.value = code })
  }

  // Flag labels for each language option
  const FLAG_LABELS = {
    en: '🇬🇧 English', es: '🇪🇸 Español', fr: '🇫🇷 Français', pt: '🇧🇷 Português',
    de: '🇩🇪 Deutsch', ru: '🇷🇺 Русский', zh: '🇨🇳 中文', ar: '🇸🇦 العربية',
  }

  // Inject flags into every .lang-select on the page
  function populateSelects() {
    document.querySelectorAll('.lang-select').forEach(sel => {
      const current = sel.value || 'en'
      sel.innerHTML = Object.entries(FLAG_LABELS)
        .map(([v, label]) => `<option value="${v}"${v === current ? ' selected' : ''}>${label}</option>`)
        .join('')
    })
  }

  // Wire all lang selectors on the page
  function wireLangSelectors() {
    document.querySelectorAll('.lang-select').forEach(sel => {
      // Remove any existing listener by cloning
      const fresh = sel.cloneNode(true)
      sel.parentNode.replaceChild(fresh, sel)
      fresh.addEventListener('change', function () {
        try { localStorage.setItem('ap_lang', this.value) } catch (_) {}
        window.applyLang(this.value)
      })
    })
  }

  function init() {
    const lang = getCurrentLang()
    populateSelects()
    document.querySelectorAll('.lang-select').forEach(s => { s.value = lang })
    if (lang !== 'en') window.applyLang(lang)
    wireLangSelectors()
  }

  // Run immediately if DOM is ready, otherwise wait
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }
})()
