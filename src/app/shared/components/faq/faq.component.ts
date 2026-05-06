import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnDestroy,
  inject,
} from '@angular/core';
import {
  AmbientLight,
  Color,
  IcosahedronGeometry,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
} from 'three';
import { animate, inView, stagger } from '@motionone/dom';
import { loadSplitting } from '../../utils/load-splitting';

type FaqCategory = 'General' | 'Loans' | 'Membership' | 'Digital' | 'Fines';

interface FaqItem {
  category: FaqCategory;
  question: string;
  answer: string;
  icon: string;
}

@Component({
  selector: 'app-faq',
  templateUrl: './faq.component.html',
  styleUrls: ['./faq.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FaqComponent implements AfterViewInit, OnDestroy {
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly categories: FaqCategory[] = ['General', 'Loans', 'Membership', 'Digital', 'Fines'];
  activeCategory: FaqCategory = 'General';
  keyword = '';

  openIndex: number | null = null;

  readonly faqs: FaqItem[] = [
    { category: 'General', question: 'What is BookCloud?', answer: 'A modern library platform to browse, borrow, and manage your reading.', icon: '📖' },
    { category: 'General', question: 'How do I create an account?', answer: 'Sign up with your email from the login page; your profile syncs with Firebase.', icon: '✉️' },
    { category: 'Loans', question: 'How many books can I borrow at once?', answer: 'Members can borrow up to the limit set by your profile or library policy (often 5).', icon: '📚' },
    { category: 'Loans', question: 'How long is the loan period?', answer: 'Default loan duration is set by the library (shown on your loan card).', icon: '📅' },
    { category: 'Loans', question: 'Can I renew a loan?', answer: 'Yes, from My Loans when renewals are allowed and under the renewal limit.', icon: '🔁' },
    { category: 'Loans', question: 'What happens if I return late?', answer: 'Your loan may be marked overdue and fines may apply according to library rules.', icon: '⏰' },
    { category: 'Membership', question: 'How do I update my profile?', answer: 'Open Profile from the menu to edit preferences and contact details.', icon: '👤' },
    { category: 'Membership', question: 'Is my data secure?', answer: 'Authentication uses Firebase; API calls are protected with your ID token.', icon: '🔒' },
    { category: 'Digital', question: 'Can I browse the catalogue without logging in?', answer: 'Some views require sign-in depending on library configuration.', icon: '🔍' },
    { category: 'Digital', question: 'How do reservations work?', answer: 'Place a hold on a title; staff or automation completes it when a copy is ready.', icon: '📌' },
    { category: 'Fines', question: 'Where can I see outstanding fines?', answer: 'Check My Profile activity or the fines section when enabled by your library.', icon: '💳' },
    { category: 'Fines', question: 'How do I pay a fine?', answer: 'Follow instructions from your librarian or in-app payment when available.', icon: '✅' },
  ];

  private rafId?: number;
  private renderer?: WebGLRenderer;
  private blobMesh?: Mesh;

  onKeyword(): void {
    this.cdr.markForCheck();
  }

  filtered(): FaqItem[] {
    const k = this.keyword.trim().toLowerCase();
    return this.faqs.filter((f) => {
      if (f.category !== this.activeCategory) {
        return false;
      }
      if (!k) {
        return true;
      }
      return (
        f.question.toLowerCase().includes(k) ||
        f.answer.toLowerCase().includes(k)
      );
    });
  }

  selectCategory(c: FaqCategory): void {
    this.activeCategory = c;
    this.openIndex = null;
    this.cdr.markForCheck();
    this.animateListSwap();
  }

  toggle(i: number): void {
    this.openIndex = this.openIndex === i ? null : i;
    this.cdr.markForCheck();
    requestAnimationFrame(() => this.updateAccordionHeights());
  }

  private updateAccordionHeights(): void {
    const root = this.host.nativeElement;
    const items = root.querySelectorAll('.faq-item');
    items.forEach((node: Element, idx: number) => {
      const wrap = node.querySelector('.faq-body') as HTMLElement | null;
      const inner = node.querySelector('.faq-body-inner') as HTMLElement | null;
      const ic = node.querySelector('.faq-plus') as HTMLElement | null;
      const open = this.openIndex === idx;
      if (!wrap || !inner || !ic) {
        return;
      }
      const h = open ? `${inner.scrollHeight}px` : '0px';
      animate(wrap, { height: h, opacity: open ? [0, 1] : [1, 0] }, { duration: 0.35, easing: [0.4, 0, 0.2, 1] });
      animate(ic, { transform: open ? 'rotate(45deg)' : 'rotate(0deg)' }, { duration: 0.3 });
      animate(
        node as HTMLElement,
        {
          borderColor: open ? 'rgba(123,94,167,0.45)' : 'rgba(255,255,255,0.08)',
        },
        { duration: 0.3 },
      );
    });
  }

  private animateListSwap(): void {
    const root = this.host.nativeElement;
    const items = root.querySelectorAll('.faq-item');
    animate(
      Array.from(items) as HTMLElement[],
      { opacity: [0, 1], transform: ['translateY(10px)', 'none'] },
      { duration: 0.35, delay: stagger(0.06) },
    );
  }

  ngAfterViewInit(): void {
    const root = this.host.nativeElement;
    inView(
      root.querySelector('.faq-list') as Element,
      () => {
        animate(
          root.querySelectorAll('.faq-item'),
          { opacity: [0, 1], transform: ['translateX(20px)', 'none'] },
          { duration: 0.4, delay: stagger(0.08) },
        );
      },
      { margin: '-100px 0px -100px 0px' },
    );

    void this.splitHeading();
    const mobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches;
    if (!mobile) {
      this.initBlob();
    }
  }

  private async splitHeading(): Promise<void> {
    const el = this.host.nativeElement.querySelector('.faq-heading-split');
    if (!el) {
      return;
    }
    try {
      const Splitting = await loadSplitting();
      Splitting({ target: el, by: 'words' });
      const words = el.querySelectorAll('.word');
      animate(
        Array.from(words) as HTMLElement[],
        { opacity: [0, 1], transform: ['translateY(15px)', 'none'] },
        { duration: 0.5, delay: stagger(0.08) },
      );
    } catch {
      /* optional */
    }
  }

  private initBlob(): void {
    const canvas = this.host.nativeElement.querySelector('.faq-blob-canvas') as HTMLCanvasElement | null;
    if (!canvas) {
      return;
    }
    const w = canvas.clientWidth || 400;
    const h = 280;
    const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setSize(w, h);
    this.renderer = renderer;
    const scene = new Scene();
    const camera = new PerspectiveCamera(45, w / h, 0.1, 100);
    camera.position.z = 4;
    const geo = new IcosahedronGeometry(1.2, 2);
    const mat = new MeshBasicMaterial({
      color: new Color(0x7b5ea7),
      wireframe: true,
      transparent: true,
      opacity: 0.06,
    });
    const mesh = new Mesh(geo, mat);
    scene.add(mesh);
    scene.add(new AmbientLight(0xffffff, 0.8));
    this.blobMesh = mesh;
    const loop = (t: number) => {
      this.rafId = requestAnimationFrame(loop);
      mesh.rotation.x = t * 0.0004;
      mesh.rotation.y = t * 0.0006;
      renderer.render(scene, camera);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  ngOnDestroy(): void {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
    }
    this.blobMesh?.geometry.dispose();
    (this.blobMesh?.material as MeshBasicMaterial)?.dispose();
    this.renderer?.dispose();
  }
}
