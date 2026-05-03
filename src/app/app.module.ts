import { HTTP_INTERCEPTORS, HttpClient, HttpClientModule } from '@angular/common/http';
import { APP_INITIALIZER, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { TranslateLoader, TranslateModule, TranslateService } from '@ngx-translate/core';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { CategoriesGridComponent } from './components/categories-grid/categories-grid.component';
import { FeaturedBooksComponent } from './components/featured-books/featured-books.component';
import { HeroThreeComponent } from './components/hero-three/hero-three.component';
import { HowItWorksComponent } from './components/how-it-works/how-it-works.component';
import { NavbarComponent } from './components/navbar/navbar.component';
import { SiteFooterComponent } from './components/site-footer/site-footer.component';
import { StatsBannerComponent } from './components/stats-banner/stats-banner.component';
import { AboutPageComponent } from './pages/about/about-page.component';
import { CataloguePageComponent } from './pages/catalogue/catalogue-page.component';
import { HomeComponent } from './pages/home/home.component';
import { httpTranslateLoaderFactory } from './shared/http-translate-loader';
import { translateAppInitializerFactory } from './shared/translate-app-initializer.factory';
import { SharedModule } from './shared/shared.module';
import { AuthInterceptor } from './services/auth.interceptor';

@NgModule({
  declarations: [
    AppComponent,
    NavbarComponent,
    HeroThreeComponent,
    StatsBannerComponent,
    FeaturedBooksComponent,
    CategoriesGridComponent,
    HowItWorksComponent,
    SiteFooterComponent,
    HomeComponent,
    CataloguePageComponent,
    AboutPageComponent,
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
  ],
  providers: [
    {
      provide: APP_INITIALIZER,
      useFactory: translateAppInitializerFactory,
      deps: [TranslateService],
      multi: true,
    },
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
