import { HTTP_INTERCEPTORS, HttpClient, HttpClientModule } from '@angular/common/http';
import { APP_INITIALIZER, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { TranslateLoader, TranslateModule, TranslateService } from '@ngx-translate/core';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { AuthModule } from './features/auth/auth.module';
import { UserModule } from './features/users/user.module';
import { CategoriesGridComponent } from './shared/components/categories-grid/categories-grid.component';
import { FaqComponent } from './shared/components/faq/faq.component';
import { FeaturedBooksComponent } from './shared/components/featured-books/featured-books.component';
import { HeroThreeComponent } from './shared/components/hero-three/hero-three.component';
import { HowItWorksComponent } from './shared/components/how-it-works/how-it-works.component';
import { NewsAnnouncementsComponent } from './shared/components/news-announcements/news-announcements.component';
import { OpeningHoursComponent } from './shared/components/opening-hours/opening-hours.component';
import { PartnersStripComponent } from './shared/components/partners-strip/partners-strip.component';
import { QuickSearchStripComponent } from './shared/components/quick-search-strip/quick-search-strip.component';
import { TestimonialsComponent } from './shared/components/testimonials/testimonials.component';
import { NavbarComponent } from './shared/components/navbar/navbar.component';
import { SiteFooterComponent } from './shared/components/site-footer/site-footer.component';
import { StatsBannerComponent } from './shared/components/stats-banner/stats-banner.component';
import { AboutPageComponent } from './features/dashboard/about/about-page.component';
import { AdminDashboardPageComponent } from './features/dashboard/admin/admin-dashboard-page.component';
import { AdminCategoriesPageComponent } from './features/dashboard/admin/categories/admin-categories-page.component';
import { AdminPartnersPageComponent } from './features/dashboard/admin/partners/admin-partners-page.component';
import { AdminLoansPageComponent } from './features/dashboard/admin/loans/admin-loans-page.component';
import { AdminReservationsPageComponent } from './features/dashboard/admin/reservations/admin-reservations-page.component';
import { AdminBooksPageComponent } from './features/dashboard/admin/books/admin-books-page.component';
import { AdminAuthorsPageComponent } from './features/dashboard/admin/authors/admin-authors-page.component';
import { AdminUsersPageComponent } from './features/dashboard/admin/users/admin-users-page.component';
import { AdminRolesPageComponent } from './features/dashboard/admin/roles/admin-roles-page.component';
import { AdminLibrarySettingsPageComponent } from './features/dashboard/admin/settings/admin-library-settings-page.component';
import { AdminModerationPageComponent } from './features/dashboard/admin/moderation/admin-moderation-page.component';
import { AdminOffersPageComponent } from './features/dashboard/admin/offers/admin-offers-page.component';
import { AdminNewsPageComponent } from './features/dashboard/admin/news/admin-news-page.component';
import { AdminBranchesPageComponent } from './features/dashboard/admin/branches/admin-branches-page.component';
import { AdminSidebarComponent } from './features/dashboard/admin/components/admin-sidebar/admin-sidebar.component';
import { AdminTopbarComponent } from './features/dashboard/admin/components/admin-topbar/admin-topbar.component';
import { AdminPageHeadComponent } from './features/dashboard/admin/components/admin-page-head/admin-page-head.component';
import { HomeComponent } from './features/dashboard/home/home.component';
import { AuthorsPageComponent } from './features/books/authors/authors-page.component';
import { BookDetailPageComponent } from './features/books/book-detail/book-detail-page.component';
import { CategoriesPageComponent } from './features/books/categories/categories-page.component';
import { CatalogueBookCardComponent } from './features/books/catalogue/catalogue-book-card/catalogue-book-card.component';
import { CatalogueFiltersSidebarComponent } from './features/books/catalogue/catalogue-filters/catalogue-filters-sidebar.component';
import { CatalogueHeroComponent } from './features/books/catalogue/catalogue-hero/catalogue-hero.component';
import { CataloguePageComponent } from './features/books/catalogue/catalogue-page.component';
import { CatalogueQuickViewComponent } from './features/books/catalogue/catalogue-quick-view/catalogue-quick-view.component';
import { CatalogueToolbarComponent } from './features/books/catalogue/catalogue-toolbar/catalogue-toolbar.component';
import { OffersPageComponent } from './features/offers/offers-page/offers-page.component';
import { OfferDetailPageComponent } from './features/offers/offer-detail/offer-detail-page.component';
import { httpTranslateLoaderFactory } from './shared/http-translate-loader';
import { translateAppInitializerFactory } from './shared/translate-app-initializer.factory';
import { SharedModule } from './shared/shared.module';
import { ApiErrorInterceptor } from './core/interceptors/api-error.interceptor';
import { AuthInterceptor } from './core/interceptors/auth.interceptor';
import { HomePopularRecommendationsComponent } from './shared/components/home-popular-recommendations/home-popular-recommendations.component';
import { FavoritesPageComponent } from './features/users/favorites/favorites-page/favorites-page.component';
import { MyLoansPageComponent } from './features/users/loans/my-loans-page/my-loans-page.component';
import { ErrorPageComponent } from './features/errors/error-page.component';

@NgModule({
  declarations: [
    AppComponent,
    NavbarComponent,
    HeroThreeComponent,
    StatsBannerComponent,
    FeaturedBooksComponent,
    CategoriesGridComponent,
    HowItWorksComponent,
    QuickSearchStripComponent,
    NewsAnnouncementsComponent,
    TestimonialsComponent,
    FaqComponent,
    OpeningHoursComponent,
    PartnersStripComponent,
    SiteFooterComponent,
    HomeComponent,
    AdminDashboardPageComponent,
    AdminCategoriesPageComponent,
    AdminPartnersPageComponent,
    AdminLoansPageComponent,
    AdminReservationsPageComponent,
    AdminBooksPageComponent,
    AdminAuthorsPageComponent,
    AdminUsersPageComponent,
    AdminRolesPageComponent,
    AdminLibrarySettingsPageComponent,
    AdminModerationPageComponent,
    AdminOffersPageComponent,
    AdminNewsPageComponent,
    AdminBranchesPageComponent,
    AdminSidebarComponent,
    AdminTopbarComponent,
    AdminPageHeadComponent,
    CataloguePageComponent,
    CatalogueHeroComponent,
    CatalogueToolbarComponent,
    CatalogueFiltersSidebarComponent,
    CatalogueBookCardComponent,
    CatalogueQuickViewComponent,
    AboutPageComponent,
    CategoriesPageComponent,
    AuthorsPageComponent,
    BookDetailPageComponent,
    OffersPageComponent,
    OfferDetailPageComponent,
    ErrorPageComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    TranslateModule.forRoot({
      defaultLanguage: 'en',
      loader: {
        provide: TranslateLoader,
        useFactory: httpTranslateLoaderFactory,
        deps: [HttpClient],
      },
    }),
    SharedModule,
    AuthModule,
    UserModule,
    HomePopularRecommendationsComponent,
    FavoritesPageComponent,
    MyLoansPageComponent,
  ],
  providers: [
    {
      provide: APP_INITIALIZER,
      useFactory: translateAppInitializerFactory,
      deps: [TranslateService],
      multi: true,
    },
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
    { provide: HTTP_INTERCEPTORS, useClass: ApiErrorInterceptor, multi: true },
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
