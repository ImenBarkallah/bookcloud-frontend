import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  inject,
} from '@angular/core';
import { Subscription } from 'rxjs';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import { resolvePublicUploadUrl } from '../../../core/utils/public-upload-url';
import { NewsApiService, NewsDto, NewsType } from '../../../core/services/news-api.service';

@Component({
  selector: 'app-news-announcements',
  templateUrl: './news-announcements.component.html',
  styleUrls: ['./news-announcements.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NewsAnnouncementsComponent implements AfterViewInit, OnDestroy {
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly api = inject(NewsApiService);

  readonly uploadUrl = resolvePublicUploadUrl;

  loading = true;
  items: NewsDto[] = [];
  activeTab: 'ALL' | NewsType = 'ALL';

  private readonly sub = new Subscription();
  private scrollTrigger?: ScrollTrigger;
  private introTween?: gsap.core.Tween | gsap.core.Timeline;

  ngAfterViewInit(): void {
    gsap.registerPlugin(ScrollTrigger);
    this.sub.add(
      this.api.listActive(null).subscribe({
        next: (rows) => {
          this.items = (rows ?? []).filter((x) => x && x.active !== false);
          this.loading = false;
          queueMicrotask(() => this.initMotion());
        },
        error: () => {
          this.items = [];
          this.loading = false;
          queueMicrotask(() => this.initMotion());
        },
      }),
    );
  }

  ngOnDestroy(): void {
    this.scrollTrigger?.kill();
    const st = this.introTween?.scrollTrigger;
    st?.kill();
    this.introTween?.kill();
    this.sub.unsubscribe();
  }

  setTab(t: 'ALL' | NewsType): void {
    this.activeTab = t;
  }

  filtered(): NewsDto[] {
    const all = this.items ?? [];
    if (this.activeTab === 'ALL') return all;
    return all.filter((x) => x.type === this.activeTab);
  }

  featuredItem(): NewsDto | null {
    const rows = this.filtered();
    return rows.length ? rows[0] : null;
  }

  sideItems(featured: NewsDto | null): NewsDto[] {
    const rows = this.filtered();
    const fid = featured?.id;
    return rows.filter((x) => x.id !== fid).slice(0, 4);
  }

  badgeMeta(t: NewsType): { cls: string; label: string; icon: string } {
    if (t === 'EVENT') return { cls: 'badge-purple', label: 'EVENT', icon: '📅' };
    if (t === 'TIP') return { cls: 'badge-cyan', label: 'TIP', icon: '💡' };
    return { cls: 'badge-amber', label: 'ANNOUNCEMENT', icon: '📢' };
  }

  formatDate(raw: string | null): string {
    if (!raw) return '';
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return raw;
    return d.toLocaleDateString();
  }

  bgStyle(n: NewsDto): Record<string, string> {
    const url = (n.imageUrl ?? '').trim();
    if (!url) return {};
    return { backgroundImage: `url(${this.uploadUrl(url) ?? url})` };
  }

  private initMotion(): void {
    const root = this.host.nativeElement;
    const heading = root.querySelector('.news-title-main');
    const featured = root.querySelector('.news-featured');
    const items = root.querySelectorAll('.news-item');

    if (heading) {
      this.scrollTrigger = ScrollTrigger.create({
        trigger: heading,
        start: 'top 85%',
        once: true,
        onEnter: () => heading.classList.add('underline-visible'),
      });
    }

    this.introTween = gsap.timeline({
      scrollTrigger: {
        trigger: root,
        start: 'top 80%',
        once: true,
      },
    });
    if (featured) {
      this.introTween.fromTo(
        featured,
        { opacity: 0, y: 26 },
        { opacity: 1, y: 0, duration: 0.55, ease: 'power2.out' },
      );
    }
    if (items.length) {
      this.introTween.fromTo(
        items,
        { opacity: 0, x: 18 },
        { opacity: 1, x: 0, duration: 0.4, stagger: 0.08, ease: 'power2.out' },
        featured ? '-=0.25' : 0,
      );
    }
  }
}
