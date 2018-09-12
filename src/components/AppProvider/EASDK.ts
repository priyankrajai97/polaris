import {autobind} from '@shopify/javascript-utilities/decorators';

import {Bar, Messenger, Modal, ResourcePicker} from '../../embedded/easdk';

export interface Options {
  /** The API key for your application from the Partner dashboard */
  apiKey: string;
  /** The current shop’s origin, provided in the session from the Shopify API */
  shopOrigin: string;
  /** Forces a redirect to the relative admin path when not rendered in an iframe */
  forceRedirect?: boolean;
  /**  Metadata for the embedded app */
  metadata?: object;
  /** Prints logs of each message passed through the EASDK */
  debug?: boolean;
}

export interface User {
  name: string;
  accountAccess: 'Account owner' | 'Full access' | 'Limited access';
}

export enum Messages {
  INITIALIZE = 'Shopify.API.initialize',
  LOADING_ON = 'Shopify.API.Bar.loading.on',
  LOADING_OFF = 'Shopify.API.Bar.loading.off',
  CLOSE_DROPDOWN = 'Shopify.API.Bar.closeDropdown',
  FLASH_NOTICE = 'Shopify.API.flash.notice',
  FLASH_ERROR = 'Shopify.API.flash.error',
  MODAL_OPEN = 'Shopify.API.Modal.open',
  MODAL_CONFIRM = 'Shopify.API.Modal.confirm',
  MODAL_ALERT = 'Shopify.API.Modal.alert',
  MODAL_CLOSE = 'Shopify.API.Modal.close',
  MODAL_COLLECTION_PICKER = 'Shopify.API.Modal.collectionPicker',
  MODAL_PRODUCT_PICKER = 'Shopify.API.Modal.productPicker',
  PUSH_STATE = 'Shopify.API.pushState',
  REDIRECT = 'Shopify.API.redirect',
  SET_WINDOW_LOCATION = 'Shopify.API.setWindowLocation',
}

interface InitData {
  User?: {
    current: User;
  };
}

interface ModalOnClose {
  result: boolean;
  data?: object;
}

export default class EASDK {
  currentUser?: User;
  Bar: Bar;
  Modal: Modal;
  ResourcePicker: ResourcePicker;

  private messenger: Messenger;

  constructor(
    {apiKey, shopOrigin, debug, forceRedirect}: Options,
    metadata: object,
  ) {
    checkFrameRedirect(apiKey, shopOrigin, forceRedirect);

    this.messenger = new Messenger(
      window.parent,
      {
        'Shopify.API.initialize': (data: InitData) => {
          if (data && data.User && data.User.current) {
            this.currentUser = data.User.current;
          }
        },
        'Shopify.API.Modal.close': ({result, data}: ModalOnClose) => {
          this.Modal.callCloseCallback(result, data);
        },
      },
      {
        name: 'iframe',
        targetOrigin: shopOrigin,
        debug,
      },
    );

    this.Bar = new Bar(this.messenger);
    this.Modal = new Modal(this.messenger);
    this.ResourcePicker = new ResourcePicker(this.messenger, this.Modal);

    this.messenger.send(Messages.INITIALIZE, {
      apiKey,
      shopOrigin,
      metadata,
      debug,
      forceRedirect,
    });
  }

  @autobind
  startLoading() {
    this.messenger.send(Messages.LOADING_ON);
  }

  @autobind
  stopLoading() {
    this.messenger.send(Messages.LOADING_OFF);
  }

  @autobind
  showFlashNotice(message: string, options: {error?: boolean} = {}) {
    const {error = false} = options;
    const type = error ? Messages.FLASH_ERROR : Messages.FLASH_NOTICE;
    this.messenger.send(type, {message});
  }

  @autobind
  pushState(location: string) {
    this.messenger.send(Messages.PUSH_STATE, {location});
  }

  @autobind
  redirect(location: string) {
    this.messenger.send(Messages.REDIRECT, {location});
  }
}

function checkFrameRedirect(
  apiKey: Options['apiKey'],
  shopOrigin: Options['shopOrigin'] = 'https://myshopify.com',
  forceRedirect: Options['forceRedirect'],
) {
  if (window !== window.parent) {
    return;
  }

  let redirectUrl = `${shopOrigin}/admin/apps/`;
  if (apiKey) {
    redirectUrl = `${redirectUrl}${apiKey}${window.location.pathname}${
      window.location.search
    }`;
  }

  if (forceRedirect) {
    window.location.assign(redirectUrl);
  } else {
    // eslint-disable-next-line no-console
    console.warn(
      `Embedded app was not loaded in an iframe and redirecting is disabled. Set forceRedirect to true and this page will redirect to: ${redirectUrl}`,
    );
  }
}
