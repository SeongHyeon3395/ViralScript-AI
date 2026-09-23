export const SITE_MAINTENANCE_MODES = ['update', 'incident', 'bugfix'] as const;

export type SiteMaintenanceMode = (typeof SITE_MAINTENANCE_MODES)[number];

export const SITE_MAINTENANCE_COPY: Record<SiteMaintenanceMode, Record<'ko' | 'en' | 'ja' | 'zh', { title: string; message: string }>> = {
  update: {
    ko: { title: '서비스 업데이트 중입니다', message: '더 나은 서비스를 위해 업데이트를 진행하고 있습니다. 잠시 후 다시 방문해 주세요.' },
    en: { title: 'We’re updating the service', message: 'We’re making ViralScript AI better. Please check back shortly.' },
    ja: { title: 'サービスを更新しています', message: 'より良いサービスのため更新中です。しばらくしてから再度お越しください。' },
    zh: { title: '服务正在更新', message: '我们正在改进服务，请稍后再来。' },
  },
  incident: {
    ko: { title: '사이트 오류를 확인하고 있습니다', message: '일시적인 문제를 확인하고 있습니다. 불편을 드려 죄송합니다. 잠시 후 다시 방문해 주세요.' },
    en: { title: 'We’re investigating a service issue', message: 'We’re sorry for the disruption. Please check back shortly.' },
    ja: { title: 'サイトの問題を確認しています', message: 'ご不便をおかけして申し訳ありません。しばらくしてから再度お越しください。' },
    zh: { title: '我们正在排查网站问题', message: '很抱歉给您带来不便，请稍后再来。' },
  },
  bugfix: {
    ko: { title: '버그 수정 및 점검 중입니다', message: '안정적인 이용을 위해 점검하고 있습니다. 잠시 후 다시 방문해 주세요.' },
    en: { title: 'We’re fixing a few things', message: 'We’re performing maintenance to improve reliability. Please check back shortly.' },
    ja: { title: '不具合の修正と点検を行っています', message: '安定したサービス提供のため点検中です。しばらくしてから再度お越しください。' },
    zh: { title: '我们正在修复问题并进行维护', message: '为了提供稳定的服务，我们正在进行维护，请稍后再来。' },
  },
};

export const SITE_MAINTENANCE_LABELS: Record<SiteMaintenanceMode, string> = {
  update: '사이트 업데이트',
  incident: '사이트 오류',
  bugfix: '버그 수리 및 점검',
};
