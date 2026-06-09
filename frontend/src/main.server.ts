import { BootstrapContext, bootstrapApplication } from '@angular/platform-browser';
import { registerLocaleData } from '@angular/common';
import localeIt from '@angular/common/locales/it';
import { App } from './app/app';
import { config } from './app/app.config.server';

registerLocaleData(localeIt, 'it');

const bootstrap = (context: BootstrapContext) =>
    bootstrapApplication(App, config, context);

export default bootstrap;
