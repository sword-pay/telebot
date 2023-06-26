import * as Sentry from '@sentry/react';
import { AppearanceProvider } from 'AppearanceProvider';
import { Suspense, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import {
    Route,
    Routes,
    To,
    createSearchParams,
    generatePath,
    matchPath,
} from 'react-router-dom';
import { useLocation, useNavigate } from 'react-router-dom';

import { BaseOfferRestDtoTypeEnum } from 'api/p2p/generated-common';
import API from 'api/wallet';
import { AccessToken, FrontendCryptoCurrencyEnum } from 'api/wallet/generated';

import { Amplitude } from 'types/amplitude';
import { InvoiceStatus, WebApp, WebView } from 'types/webApp';

import routePaths from 'routePaths';

import { AMPLITUDE_NEW_PROJECT_INSTANCE_NAME } from 'config';

import { RootState, useAppSelector } from 'store';

import {
    resetCampaignParticipation,
    resetGift,
    setCampaignParticipation,
    setGift,
} from 'reducers/gift/giftSlice';
import { setLocation } from 'reducers/location/locationSlice';
import { setDefaultCurrencies } from 'reducers/p2p/adFormSlice';
import { setFilters } from 'reducers/p2p/domSlice';
import { setP2P } from 'reducers/p2p/p2pSlice';
import { setUser } from 'reducers/p2p/userSlice';
import { cleanPurchase, updatePurchase } from 'reducers/purchase/purchaseSlice';
import {
    updateFiatCurrency,
    updateLanguage,
    updatePreferredAsset,
} from 'reducers/settings/settingsSlice';
import {
    setAuthorized,
    setIsRussian,
    updateFeatureFlags,
    updatePermissions,
    updatePurchaseByCard,
} from 'reducers/user/userSlice';
import { updateWallet } from 'reducers/wallet/walletSlice';
import { updateWarningsVisibility } from 'reducers/warningsVisibility/warningsVisibilitySlice';

import Error from 'pages/Error/Error';
import { NotFound } from 'pages/NotFound';
// import SendGift from 'pages/SendGift/SendGift';
import Settings from 'pages/Settings/Settings';
import SettingsAssets from 'pages/SettingsAssets/SettingsAssets';
import SettingsLanguage from 'pages/SettingsLanguage/SettingsLanguage';
import Unavailable from 'pages/Unavailable';
import UnknownError from 'pages/UnknownError';
import CountryForbidden from 'pages/p2p/CountryForbidden';
import { HomePageFallback } from 'pages/p2p/HomePage/HomePageFallback';
import { OfferPageFallback } from 'pages/p2p/OfferPage/OfferPageFallback';
import { OfferPreviewPageFallback } from 'pages/p2p/OfferPreviewPage/OfferPreviewPageFallback';
import { OffersListPageFallback } from 'pages/p2p/OffersListPage/OffersListPageFallback';
import OperationsUnavailable from 'pages/p2p/OperationsUnavailable/OperationsUnavailable';
import { OrderPageFallback } from 'pages/p2p/OrderPage/OrderPageFallback';
import { UserProfilePageFallback } from 'pages/p2p/UserProfilePage/UserProfilePageFallback';
import Asset from 'pages/wallet/Assets/Asset/Asset';
import Assets from 'pages/wallet/Assets/Assets';
import ChooseAsset from 'pages/wallet/Assets/ChooseAsset/ChooseAsset';
import Purchase from 'pages/wallet/Assets/Purchase/Purchase';
import { ReceiverSearch } from 'pages/wallet/Assets/ReceiverSearch/ReceiverSearch';
import Send from 'pages/wallet/Assets/Send/Send';
import { SendRequestConfirmation } from 'pages/wallet/Assets/SendRequestConfirmation/SendRequestConfirmation';
import { SendRequestStatus } from 'pages/wallet/Assets/SendRequestStatus/SendRequestStatus';
import { AttachesPromo } from 'pages/wallet/AttachesPromo/AttachesPromo';
import { Exchange } from 'pages/wallet/Exchange/Exchange';
import { ExchangeConfirmation } from 'pages/wallet/Exchange/ExchangeConfirmation/ExchangeConfirmation';
import { ExchangeForm } from 'pages/wallet/Exchange/ExchangeForm/ExchangeForm';
import { FirstDeposit } from 'pages/wallet/FirstDeposit/FirstDeposit';
import { FirstTransaction } from 'pages/wallet/FirstTransaction/FirstTransaction';
import KYC from 'pages/wallet/KYC/KYC';
import Main from 'pages/wallet/Main/Main';
import Onboarding from 'pages/wallet/Onboarding/Onboarding';
// import OpenGift from 'pages/OpenGift/OpenGift';
import PurchaseStatus from 'pages/wallet/PurchaseStatus/PurchaseStatus';
import { Receive } from 'pages/wallet/Receive/Receive';
import Transaction from 'pages/wallet/Transaction/TransactionPage';
import { UsdtRuffleMain } from 'pages/wallet/UsdtRuffle/UsdtRuffleMain/UsdtRuffleMain';
import { UsdtRuffleTicketsPage } from 'pages/wallet/UsdtRuffle/UsdtRuffleTickets/UsdtRuffleTickets';
import { WPAYOrderPaymentSkeleton } from 'pages/wpay/OrderPayment/OrderPaymentSkeleton';

import SnackbarProvider from 'components/Snackbar/SnackbarProvider';

import { convertLangCodeFromAPItoISO, setLanguage } from 'utils/common/lang';
import { logEvent } from 'utils/common/logEvent';
import { multiLazy } from 'utils/common/multiLazy';
import { parseStartAttach } from 'utils/common/startattach';
import { refreshBalance } from 'utils/wallet/balance';

import { useDidUpdate } from 'hooks/utils/useDidUpdate';
import { useIsPageReloaded } from 'hooks/utils/useIsPageReloaded';

import { updateTransaction } from './query/wallet/transactions/useTransactions';

function expandWebview(): void {
    if (window.Telegram.WebApp.isExpanded) return;

    window.Telegram.WebApp.expand();

    const expandInterval = setInterval(() => {
        if (window.Telegram.WebApp.isExpanded) {
            clearInterval(expandInterval);
            return;
        }

        window.Telegram.WebApp.expand();
    }, 500);
}

const SentryRoutes = Sentry.withSentryReactRouterV6Routing(Routes);

const [WPAYOrderPayment, WPAYChoosePaymentAsset, WPAYChooseDepositType] =
    multiLazy([
        () => import('pages/wpay/OrderPayment/OrderPayment'),
        () => import('pages/wpay/ChoosePaymentAsset/ChoosePaymentAsset'),
        () => import('pages/wpay/ChooseDepositType/ChooseDepositType'),
    ]);

const [
    HomePage,
    OffersListPage,
    CountryNotSupported,
    CreateEditOfferSuccessPage,
    CreateOfferPage,
    EditOfferPage,
    NotificationPage,
    OfferPage,
    OfferDetails,
    OfferForm,
    OfferPreviewPage,
    OrderPage,
    UserProfilePage,
    AddComment,
    AddPaymentDetailsList,
    AddPaymentDetailsNew,
    ChoosePaymentMethods,
    DraftOfferForm,
    PreviewOffer,
    SelectFiatCurrency,
    RoutesGuard,
    UserPaymentsPage,
    AddNewPayment,
    CreatePayment,
    EditPayment,
    PaymentsList,
    OfferSelectPayment,
    OfferCreatePayment,
] = multiLazy([
    () => import('pages/p2p/HomePage/HomePage'),
    () => import('pages/p2p/OffersListPage/OffersListPage'),
    () => import('pages/p2p/CountryNotSupported/CountryNotSupported'),
    () =>
        import('pages/p2p/CreateEditOfferSuccessPage/CreateEditOfferSuccessPage'),
    () => import('pages/p2p/CreateOfferPage/CreateOfferPage'),
    () => import('pages/p2p/EditOfferPage/EditOfferPage'),
    () => import('pages/p2p/NotificationsPage/NotificationsPage'),
    () => import('pages/p2p/OfferPage/OfferPage'),
    () => import('pages/p2p/OfferPage/components/OfferDetails/OfferDetails'),
    () => import('pages/p2p/OfferPage/components/OfferForm/OfferForm'),
    () => import('pages/p2p/OfferPreviewPage/OfferPreviewPage'),
    () => import('pages/p2p/OrderPage/OrderPage'),
    () => import('pages/p2p/UserProfilePage/UserProfilePage'),
    () =>
        import('containers/p2p/CreateEditOffer/components/AddComment/AddComment'),
    () =>
        import(
            'containers/p2p/CreateEditOffer/components/AddPaymentDetails/AddPaymentDetailsList'
            ),
    () =>
        import(
            'containers/p2p/CreateEditOffer/components/AddPaymentDetails/AddPaymentDetailsNew'
            ),
    () =>
        import(
            'containers/p2p/CreateEditOffer/components/ChoosePaymentMethods/ChoosePaymentMethods'
            ),
    () =>
        import(
            'containers/p2p/CreateEditOffer/components/DraftOfferForm/DraftOfferForm'
            ),
    () =>
        import(
            'containers/p2p/CreateEditOffer/components/PreviewOffer/PreviewOffer'
            ),
    () => import('containers/p2p/CreateEditOffer/components/SelectFiatCurrency'),
    () => import('containers/p2p/RoutesGuard/RoutesGuard'),
    () => import('pages/p2p/UserPaymentsPage/UserPaymentsPage'),
    () =>
        import('pages/p2p/UserPaymentsPage/components/AddNewPayment/AddNewPayment'),
    () => import('pages/p2p/UserPaymentsPage/components/CreatePayment'),
    () => import('pages/p2p/UserPaymentsPage/components/EditPayment'),
    () =>
        import('pages/p2p/UserPaymentsPage/components/PaymentsList/PaymentsList'),
    () => import('pages/p2p/OfferPage/components/SelectPayment/SelectPayment'),
    () => import('pages/p2p/OfferPage/components/CreatePayment/CreatePayment'),
]);

declare global {
    interface Window {
        WalletAuth: Promise<AccessToken>;
        Telegram: {
            WebApp: WebApp;
            WebView: WebView;
        };
        amplitude: Amplitude;
    }
}

const ROUTE_PATTERN_TO_FALLBACK = {
    [routePaths.P2P_OFFER_CREATE]: null,
    [routePaths.P2P_OFFER_EDIT]: null,
    [routePaths.P2P_OFFER_DETAILS]: null,
    [routePaths.P2P_HOME]: HomePageFallback,
    [routePaths.P2P_OFFERS]: OffersListPageFallback,
    [routePaths.P2P_ORDER]: OrderPageFallback,
    [routePaths.P2P_OFFER]: OfferPageFallback,
    [routePaths.P2P_OFFER_PREVIEW]: OfferPreviewPageFallback,
    [routePaths.P2P_USER_PROFILE]: UserProfilePageFallback,
} as const;

const RoutesFallback = () => {
    const location = useLocation();

    const routePattern = Object.keys(ROUTE_PATTERN_TO_FALLBACK).find(
        (pattern) => {
            const isMatch = !!matchPath(
                {
                    path: pattern,
                },
                location.pathname,
            );

            return isMatch;
        },
    ) as keyof typeof ROUTE_PATTERN_TO_FALLBACK | undefined;

    if (!routePattern) {
        return null;
    }

    const Fallback = ROUTE_PATTERN_TO_FALLBACK[routePattern];

    if (!Fallback) {
        return null;
    }

    return <Fallback />;
};

function App() {
    const { i18n } = useTranslation();
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const location = useLocation();
    const { isBot, startParam, isYourSelf } = useSelector(
        (state: RootState) => state.session,
    );
    const {
        payment_id: paymentId,
        purchase_id: purchaseId,
        method: paymentMethod,
        status: paymentStatus,
        assetCurrency: paymentAssetCurrency,
    } = useSelector((state: RootState) => state.purchase);
    const { languageCode, preferredAsset } = useSelector(
        (state: RootState) => state.settings,
    );
    const authorized = useSelector((state: RootState) => state.user.authorized);
    const { isRussian, language_code: tgUserLanguageCode } = useSelector(
        (state: RootState) => state.user,
    );
    const { russianCardRestrictionPopup } = useSelector(
        (state: RootState) => state.warningsVisibility,
    );
    const purchasePollingTimeout = useRef<number>();
    const { id } = useSelector((state: RootState) => state.user);
    const { userId: p2pUserId } = useSelector(
        (state: RootState) => state.p2pUser,
    );
    const fiatCurrency = useAppSelector((state) => state.settings.fiatCurrency);

    // Из-за того, что мы сначала попадаем на /wv, а потом на нужный роут, в Sentry при pageload отсылается куча
    // переходов на /wv, хотя на самом деле юзер находится уже не там.
    const navigateAndCapture = (to: To) => {
        navigate(to);
        Sentry.configureScope((scope) =>
            scope.setTransactionName(
                typeof to === 'string'
                    ? to
                    : `${String(to.pathname)}?${String(to.search)}`,
            ),
        );
    };

    useDidUpdate(() => {
        setLanguage(i18n, languageCode);
    }, [languageCode, i18n]);

    useEffect(() => {
        const navigateToSettings = () => {
            if (location.pathname === routePaths.SETTINGS_LANGUAGE) {
                window.history.back();
            } else if (
                location.pathname !== routePaths.SETTINGS &&
                location.pathname !== routePaths.WV
            ) {
                window.Telegram.WebApp.expand();
                navigate(routePaths.SETTINGS);
            }
        };

        window.Telegram.WebApp.onEvent('settingsButtonClicked', navigateToSettings);

        return () =>
            window.Telegram.WebApp.offEvent(
                'settingsButtonClicked',
                navigateToSettings,
            );
        // eslint-disable-next-line
    }, [location]);

    useEffect(() => {
        const handler = ({ status }: { status: InvoiceStatus }) => {
            if (status === 'cancelled' && typeof purchaseId === 'number') {
                API.Purchases.cancelPurchase(purchaseId).then(() => {
                    dispatch(cleanPurchase());
                });
            }
        };
        window.Telegram.WebApp.onEvent('invoiceClosed', handler);

        return () => {
            window.Telegram.WebApp.offEvent('invoiceClosed', handler);
        };
    }, [purchaseId, dispatch]);

    useEffect(() => {
        const purchaseInfo = () => {
            paymentId &&
            paymentMethod &&
            paymentAssetCurrency &&
            API.Purchases.purchaseInfo(paymentId, paymentMethod).then((result) => {
                dispatch(updatePurchase({ status: result.data.status }));
                switch (result.data.status) {
                    case 'success':
                        refreshBalance();
                        if (isRussian && russianCardRestrictionPopup) {
                            API.WVSettings.setUserWvSettings({
                                display_ru_card_option: false,
                            }).then(() => {
                                dispatch(
                                    updateWarningsVisibility({
                                        russianCardRestrictionPopup: false,
                                    }),
                                );
                            });
                        }
                        updateTransaction(
                            (transaction) => transaction.purchase_external_id === paymentId,
                            { status: 'success' },
                        );
                        break;
                    case 'fail':
                        updateTransaction(
                            (transaction) => transaction.purchase_external_id === paymentId,
                            { status: 'fail' },
                        );
                        break;
                    case 'pending':
                        purchasePollingTimeout.current = window.setTimeout(() => {
                            purchaseInfo();
                        }, 1500);
                }
            });
        };

        clearTimeout(purchasePollingTimeout.current);
        if (paymentStatus === 'pending' && authorized) {
            purchaseInfo();
        }
        // eslint-disable-next-line
    }, [paymentStatus, paymentMethod, paymentId, authorized, dispatch]);

    const isPageReloaded = useIsPageReloaded();

    useEffect(() => {
        // Set user id for old amplitude instance
        if (process.env.NODE_ENV !== 'development') {
            window.amplitude.getInstance().setUserId(id);
        }

        if (!isPageReloaded) {
            Promise.all([window.WalletAuthPromise, window.WalletLangpackPromise])
                .then(
                    ([
                         {
                             is_new_user: isNewUser,
                             local_currency: localFiatCurrency,
                             accounts,
                             feature_flags: featureFlags,
                             country_alpha2_ip: userCountryAlpha2Code,
                             country_alpha2_phone: userCountryPhoneAlpha2Code,
                             bot_username: botUsername,
                             bot_language: botLanguage,
                             gift: gift,
                             campaign_participation: campaignParticipation,
                             user_id: userId,
                             wv_settings: wvSettings,
                             available_balance_total_fiat_amount:
                                 availableBalanceTotalFiatAmount,
                             available_balance_total_fiat_currency:
                                 availableBalanceTotalFiatCurrency,
                             permissions,
                         },
                         data,
                     ]) => {
                        // informs the Telegram app that the Web App is ready to be displayed
                        window.Telegram.WebApp.ready();

                        const botLangCode = convertLangCodeFromAPItoISO(botLanguage);

                        if (data) {
                            const { langpack } = data;
                            i18n.addResourceBundle(botLangCode, 'translation', langpack);
                            setLanguage(i18n, botLangCode);
                        } else {
                            Sentry.captureException('Langpack was not loaded');
                        }

                        Sentry.setTag('wallet.language', botLangCode);

                        if (process.env.NODE_ENV !== 'development') {
                            const amplitude = window.amplitude.getInstance(
                                AMPLITUDE_NEW_PROJECT_INSTANCE_NAME,
                            );

                            // Min user id length must be 5 symbols or amplitude won't accept it
                            const normalizedUserId = userId.toString().padStart(5, '0');

                            // Set user id for new amplitude instance
                            amplitude.setUserId(normalizedUserId);

                            if (userCountryPhoneAlpha2Code) {
                                amplitude.setUserProperties({
                                    phone_country: userCountryPhoneAlpha2Code,
                                });
                            }
                        }

                        dispatch(
                            setUser({
                                userId,
                                userCountryAlpha2Code,
                                userCountryPhoneAlpha2Code,
                            }),
                        );
                        dispatch(setAuthorized(true));

                        dispatch(updateFiatCurrency(localFiatCurrency));

                        dispatch(updateLanguage(botLangCode));

                        if (
                            preferredAsset &&
                            !accounts.find(
                                (asset) =>
                                    asset.currency === preferredAsset && asset.is_visible,
                            )
                        ) {
                            dispatch(updatePreferredAsset(FrontendCryptoCurrencyEnum.Ton));
                        }

                        dispatch(
                            updateWarningsVisibility({
                                russianCardRestriction: wvSettings.display_ru_card_restriction,
                                russianCardRestrictionPopup: wvSettings.display_ru_card_option,
                                shareGiftIsOver: wvSettings.display_share_gift_is_over,
                            }),
                        );
                        dispatch(
                            updateWallet({
                                botUsername,
                                totalFiatAmount: availableBalanceTotalFiatAmount,
                                totalFiatCurrency: availableBalanceTotalFiatCurrency,
                                assets: accounts.map((account) => {
                                    return {
                                        address: account.addresses[0].address,
                                        network: account.addresses[0].network,
                                        hasTransactions: account.has_transactions,
                                        balance: account.available_balance,
                                        currency: account.currency as FrontendCryptoCurrencyEnum,
                                        visible: account.is_visible,
                                        fiatBalance: account.available_balance_fiat_amount!,
                                        fiatCurrency: account.available_balance_fiat_currency,
                                };
                                }),
                            }),
                        );

                        dispatch(updateFeatureFlags(featureFlags));
                        dispatch(updatePermissions(permissions));

                        dispatch(
                            setIsRussian(
                                userCountryAlpha2Code?.toLowerCase() === 'ru' ||
                                userCountryPhoneAlpha2Code?.toLowerCase() === 'ru',
                            ),
                        );

                        if (campaignParticipation) {
                            dispatch(
                                setCampaignParticipation({
                                    isLastWave: campaignParticipation.is_last_wave,
                                    campaignEndDate: campaignParticipation.campaign_end_date,
                                    shareGiftCount: campaignParticipation.share_gift_count,
                                }),
                            );
                        } else {
                            dispatch(resetCampaignParticipation());
                        }

                        if (gift) {
                            dispatch(
                                setGift({
                                    amount: gift.amount,
                                    currency: gift.currency,
                                    status: gift.status,
                                }),
                            );
                        } else {
                            dispatch(resetGift());
                        }

                        if (botLanguage !== tgUserLanguageCode) {
                            Sentry.captureMessage(`tg user language !== wv user language`, {
                                level: 'info',
                            });
                        }
                        if (startParam) {
                            logEvent('Open Bot', {
                                priority: 'P2',
                                category: 'Admin',
                                startParam,
                            });
                        }

                        if (startParam) {
                            const { operation, params } = parseStartAttach(startParam);

                            if (operation === 'wpay_order' && featureFlags.wpay_as_payer) {
                                navigateAndCapture(
                                    `${routePaths.WPAY_ORDER_PAYMENT}?order_id=${params.orderId}`,
                                );
                            } else if (operation === 'st') {
                                if (
                                    params.receiverId ===
                                    window.Telegram.WebApp.initDataUnsafe.user?.id
                                ) {
                                    if (isNewUser) {
                                        window.Telegram.WebApp.expand();
                                        navigateAndCapture({
                                            pathname: routePaths.FIRST_TRANSACTION,
                                            search: createSearchParams({
                                                correspondingTransactionId: params.sentTransactionId,
                                            }).toString(),
                                        });
                                    } else {
                                        navigateAndCapture({
                                            pathname: routePaths.TRANSACTION,
                                            search: createSearchParams({
                                                correspondingTransactionId: params.sentTransactionId,
                                                from: 'direct_messages',
                                            }).toString(),
                                        });
                                    }
                                } else if (
                                    params.senderId ===
                                    window.Telegram.WebApp.initDataUnsafe.user?.id
                                ) {
                                    navigateAndCapture({
                                        pathname: routePaths.TRANSACTION,
                                        search: createSearchParams({
                                            transactionId: params.sentTransactionId,
                                            from: 'direct_messages',
                                        }).toString(),
                                    });
                                } else {
                                    navigateAndCapture(routePaths.MAIN);
                                }
                            } else if (isNewUser) {
                                window.Telegram.WebApp.expand();
                                navigateAndCapture(routePaths.ONBOARDING);
                            } else if (operation === 'receiverSearch') {
                                navigateAndCapture({
                                    pathname: generatePath(routePaths.RECEIVER_SEARCH, {
                                        assetCurrency: params.assetCurrency,
                                    }),
                                    search: createSearchParams({
                                        backPath: routePaths.MAIN,
                                    }).toString(),
                                });
                            } else if (operation === 'chooseAsset') {
                                navigateAndCapture({
                                    pathname: generatePath(routePaths.CHOOSE_ASSET, {
                                        type: params.type,
                                    }),
                                    search: createSearchParams({
                                        backPath: routePaths.MAIN,
                                    }).toString(),
                                });
                            } else if (
                                operation === 'usdt_raffle' &&
                                featureFlags.usdt_raffle &&
                                permissions.can_usdt_raffle
                            ) {
                                navigateAndCapture(routePaths.USDT_RUFFLE);
                            } else if (
                                operation === 'usdt_raffle_tickets' &&
                                featureFlags.usdt_raffle &&
                                permissions.can_usdt_raffle
                            ) {
                                navigateAndCapture(routePaths.USDT_RUFFLE_TICKETS);
                            } else if (operation === 'gift' && gift) {
                                navigateAndCapture(routePaths.OPEN_GIFT);
                            } else if (operation === 'purchasing' && paymentId) {
                                navigateAndCapture(routePaths.PURCHASE_STATUS);
                            } else if (operation === 'kyc_success') {
                                navigateAndCapture(
                                    generatePath(routePaths.PURCHASE, {
                                        assetCurrency: params.assetCurrency,
                                    }),
                                );
                            } else if (operation === 'kyc_retry') {
                                navigateAndCapture(routePaths.KYC);
                            } else if (operation === 'send_gift' && campaignParticipation) {
                                navigateAndCapture(routePaths.SEND_GIFT);
                            } else if (operation === 'send' && !isYourSelf) {
                                navigateAndCapture({
                                    pathname: routePaths.SEND,
                                    search: createSearchParams({
                                        value: String(params.value ?? 0),
                                        assetCurrency: params.assetCurrency,
                                    }).toString(),
                                });
                            } else if (operation.startsWith('offerid')) {
                                logEvent('Market opened', {
                                    category: 'p2p',
                                    source: 'link',
                                });

                                const [offerId, userId] = startParam
                                    .replace('offerid_', '')
                                    .split('_');

                                if (offerId) {
                                    expandWebview();

                                    if (Number(userId) === p2pUserId) {
                                        navigateAndCapture(
                                            generatePath(routePaths.P2P_OFFER_PREVIEW, {
                                                id: offerId,
                                            }),
                                        );
                                    } else {
                                        navigateAndCapture(
                                            generatePath(routePaths.P2P_OFFER, { id: offerId }),
                                        );
                                    }
                                } else {
                                    Sentry.captureMessage('Invalid offer id');
                                    navigateAndCapture(routePaths.P2P_HOME);
                                }
                            } else if (operation.startsWith('orderid')) {
                                logEvent('Market opened', {
                                    category: 'p2p',
                                    source: 'link',
                                });

                                const orderId = startParam.split('_')[1];

                                if (orderId) {
                                    expandWebview();

                                    navigateAndCapture(
                                        `${generatePath(routePaths.P2P_ORDER, {
                                            id: orderId,
                                        })}?${createSearchParams({
                                            showStatusWithDetails: String(true),
                                        }).toString()}`,
                                    );
                                } else {
                                    Sentry.captureMessage('Invalid order id');
                                    navigateAndCapture(routePaths.P2P_HOME);
                                }
                            } else if (operation.startsWith('marketads')) {
                                logEvent('Market opened', {
                                    category: 'p2p',
                                    source: 'bot',
                                });

                                const offerType = startParam.split(
                                    '_',
                                )[1] as BaseOfferRestDtoTypeEnum;

                                expandWebview();

                                if (offerType) {
                                    if (
                                        Object.values(BaseOfferRestDtoTypeEnum).includes(offerType)
                                    ) {
                                        navigateAndCapture(
                                            generatePath(routePaths.P2P_OFFERS, {
                                                type: offerType,
                                                '*': '',
                                            }),
                                        );
                                    } else {
                                        Sentry.captureMessage('Incorrect offer type');

                                        navigateAndCapture(
                                            generatePath(routePaths.P2P_OFFERS, {
                                                type: 'SALE',
                                                '*': '',
                                            }),
                                        );
                                    }
                                } else {
                                    Sentry.captureMessage('Not defined offer type');

                                    navigateAndCapture(
                                        generatePath(routePaths.P2P_OFFERS, {
                                            type: 'SALE',
                                            '*': '',
                                        }),
                                    );
                                }
                            } else if (operation === 'market') {
                                logEvent('Market opened', {
                                    category: 'p2p',
                                    source: 'bot',
                                });

                                navigateAndCapture(routePaths.P2P_HOME);
                            } else if (operation.startsWith('profile')) {
                                logEvent('Market opened', {
                                    category: 'p2p',
                                    source: 'bot',
                                });

                                expandWebview();

                                navigateAndCapture(routePaths.P2P_USER_PROFILE);
                            } else {
                                navigateAndCapture(routePaths.MAIN);
                            }
                        } else if (isNewUser) {
                            window.Telegram.WebApp.expand();
                            navigateAndCapture(routePaths.ONBOARDING);
                        } else {
                            navigateAndCapture(routePaths.MAIN);
                        }
                    },
                )
                .catch((error) => {
                    window.WalletLangpackPromise.then((data) => {
                        if (data) {
                            const { langpack, language } = data;

                            i18n.addResourceBundle(language, 'translation', langpack);
                            setLanguage(i18n, language);
                        } else {
                            Sentry.captureException('Langpack was not loaded');
                        }
                    }).finally(() => {
                        if (error?.status >= 500) {
                            Sentry.captureException(error);
                            navigateAndCapture(routePaths.ERROR);
                        } else if (error?.status === 404) {
                            Sentry.captureException(error);
                            navigateAndCapture(routePaths.UNKNOWN_ERROR);
                        } else if (
                            error?.status === 403 &&
                            error?.data?.code === 'content_unavailable'
                        ) {
                            navigateAndCapture(routePaths.UNAVAILABLE);
                        } else if (
                            error?.status === 403 &&
                            error?.data?.code === 'country_is_forbidden'
                        ) {
                            navigateAndCapture(routePaths.COUNTRY_FORBIDDEN);
                        } else if (
                            error?.status === 401 &&
                            error?.data?.code === 'user_not_found'
                        ) {
                            window.location.href = error?.data?.detail;
                            if (isBot) {
                                window.Telegram.WebApp.close();
                            }
                        } else {
                            Sentry.captureException('Unknown auth error');
                        }
                    });
                });
        } else {
            dispatch(setAuthorized(true));
            refreshBalance();
            logEvent('Reload page', { priority: 'P2', category: 'Admin' });
        }

        // eslint-disable-next-line
    }, [p2pUserId]);

    useEffect(() => {
        dispatch(setLocation({ location }));
    }, [dispatch, location]);

    useDidUpdate(() => {
        if (!authorized) return;
        API.Users.getPaymentMethods().then(({ data }) => {
            dispatch(
                updatePurchaseByCard({
                    available: data.card_default.is_available,
                    code: data.card_default.reason_code,
                }),
            );
        });
    }, [dispatch, authorized]);

    useDidUpdate(() => refreshBalance(), [fiatCurrency, dispatch]);

    useEffect(() => {
        if (!isPageReloaded) {
            dispatch(
                setFilters({
                    amountValue: undefined,
                    amount: undefined,
                    paymentMethods: undefined,
                }),
            );

            dispatch(
                setP2P({
                    chosenCryptoCurrencyOnAssetPageForDom: undefined,
                    chosenCryptoCurrencyOnAssetPageForAdForm: undefined,
                }),
            );
        }
    }, []);

    const { defaultCurrencies } = useAppSelector((state) => state.p2pAdForm);

    const { filters } = useAppSelector((state) => state.p2pDom);

    // TODO: remove after backend will remove USD https://jira.fix.ru/browse/WT-3664
    useEffect(() => {
        dispatch(
            setDefaultCurrencies({
                fiat: defaultCurrencies.fiat === 'USD' ? 'EUR' : defaultCurrencies.fiat,
            }),
        );

        dispatch(
            setFilters({
                ...filters,
                fiatCurrency:
                    filters?.fiatCurrency === 'USD' ? 'EUR' : filters?.fiatCurrency,
            }),
        );
    }, []);

    return (
        <AppearanceProvider>
            <SnackbarProvider>
                <Suspense fallback={<RoutesFallback />}>
                    <SentryRoutes>
                        <Route path={routePaths.WV} element={null} />
                        <Route path={routePaths.ONBOARDING} element={<Onboarding />} />
                        <Route
                            path={routePaths.FIRST_TRANSACTION}
                            element={<FirstTransaction />}
                        />
                        <Route
                            path={routePaths.ATTACHES_PROMO}
                            element={<AttachesPromo />}
                        />
                        <Route path={routePaths.FIRST_DEPOSIT} element={<FirstDeposit />} />
                        <Route path={routePaths.MAIN} element={<Main />} />
                        <Route path={routePaths.EXCHANGE} element={<Exchange />}>
                            <Route index element={<ExchangeForm />} />
                            <Route
                                path={routePaths.EXCHANGE_CONFIRMATION}
                                element={<ExchangeConfirmation />}
                            />
                        </Route>
                        <Route path={routePaths.CHOOSE_ASSET} element={<ChooseAsset />} />
                        <Route path={routePaths.ASSETS} element={<Assets />}>
                            <Route index element={<Asset />} />
                            <Route path={routePaths.PURCHASE} element={<Purchase />} />
                            <Route
                                path={routePaths.RECEIVER_SEARCH}
                                element={<ReceiverSearch />}
                            />
                        </Route>
                        <Route path={routePaths.SEND} element={<Send />} />
                        <Route
                            path={routePaths.SEND_REQUEST_CONFIRMATION}
                            element={<SendRequestConfirmation />}
                        />
                        <Route
                            path={routePaths.SEND_REQUEST_STATUS}
                            element={<SendRequestStatus />}
                        />
                        <Route path={routePaths.KYC} element={<KYC />} />
                        <Route path={routePaths.RECEIVE} element={<Receive />} />
                        <Route path={routePaths.SETTINGS} element={<Settings />} />
                        <Route
                            path={routePaths.SETTINGS_LANGUAGE}
                            element={<SettingsLanguage />}
                        />
                        <Route
                            path={routePaths.SETTINGS_ASSETS}
                            element={<SettingsAssets />}
                        />
                        <Route path={routePaths.TRANSACTION} element={<Transaction />} />
                        <Route
                            path={routePaths.PURCHASE_STATUS}
                            element={<PurchaseStatus />}
                        />
                        <Route path={routePaths.UNAVAILABLE} element={<Unavailable />} />
                        <Route path={routePaths.UNKNOWN_ERROR} element={<UnknownError />} />
                        <Route
                            path={routePaths.COUNTRY_FORBIDDEN}
                            element={<CountryForbidden />}
                        />
                        <Route
                            path={routePaths.USDT_RUFFLE_TICKETS}
                            element={<UsdtRuffleTicketsPage />}
                        />
                        <Route path={routePaths.USDT_RUFFLE} element={<UsdtRuffleMain />} />
                        <Route path={routePaths.ERROR} element={<Error />} />
                        <Route path={routePaths.OPEN_GIFT} element={<></>} />
                        <Route path={routePaths.SEND_GIFT} element={<></>} />
                        <Route element={<RoutesGuard />}>
                            <Route path={routePaths.P2P_HOME} element={<HomePage />} />
                            <Route
                                path={routePaths.P2P_NOTIFICATIONS}
                                element={<NotificationPage />}
                            />
                            <Route
                                path={routePaths.P2P_OFFERS}
                                element={<OffersListPage />}
                            />
                            <Route path={routePaths.P2P_OFFER} element={<OfferPage />}>
                                <Route index element={<OfferForm />} />
                                <Route
                                    path={routePaths.P2P_OFFER_DETAILS}
                                    element={<OfferDetails />}
                                />
                                <Route
                                    path={routePaths.P2P_OFFER_SELECT_PAYMENT}
                                    element={<OfferSelectPayment />}
                                />
                                <Route
                                    path={routePaths.P2P_OFFER_CREATE_PAYMENT}
                                    element={<OfferCreatePayment />}
                                />
                            </Route>
                            <Route
                                path={routePaths.P2P_OFFER_CREATE}
                                element={<CreateOfferPage />}
                            >
                                <Route index element={<DraftOfferForm />} />
                                <Route
                                    path={routePaths.P2P_OFFER_CREATE_ADD_PAYMENT_METHODS}
                                    element={<AddPaymentDetailsList />}
                                />
                                <Route
                                    path={routePaths.P2P_OFFER_CREATE_NEW_PAYMENT_METHOD}
                                    element={<AddPaymentDetailsNew />}
                                />
                                <Route
                                    path={routePaths.P2P_OFFER_CREATE_CHOOSE_PAYMENT_METHODS}
                                    element={<ChoosePaymentMethods />}
                                />
                                <Route
                                    path={routePaths.P2P_OFFER_CREATE_ADD_COMMENT}
                                    element={<AddComment />}
                                />
                                <Route
                                    path={routePaths.P2P_OFFER_CREATE_PREVIEW_OFFER}
                                    element={<PreviewOffer />}
                                />
                                <Route
                                    path={routePaths.P2P_OFFER_CREATE_SELECT_CURRENCY}
                                    element={<SelectFiatCurrency />}
                                />
                            </Route>
                            <Route
                                path={routePaths.P2P_OFFER_EDIT}
                                element={<EditOfferPage />}
                            >
                                <Route index element={<DraftOfferForm />} />
                                <Route
                                    path={routePaths.P2P_OFFER_EDIT_ADD_PAYMENT_METHODS}
                                    element={<AddPaymentDetailsList />}
                                />
                                <Route
                                    path={routePaths.P2P_OFFER_EDIT_NEW_PAYMENT_METHOD}
                                    element={<AddPaymentDetailsNew />}
                                />
                                <Route
                                    path={routePaths.P2P_OFFER_EDIT_CHOOSE_PAYMENT_METHODS}
                                    element={<ChoosePaymentMethods />}
                                />
                                <Route
                                    path={routePaths.P2P_OFFER_EDIT_ADD_COMMENT}
                                    element={<AddComment />}
                                />
                                <Route
                                    path={routePaths.P2P_OFFER_EDIT_PREVIEW_OFFER}
                                    element={<PreviewOffer />}
                                />
                            </Route>
                            <Route
                                path={routePaths.P2P_OFFER_CREATE_EDIT_SUCCESS}
                                element={<CreateEditOfferSuccessPage />}
                            />
                            <Route
                                path={routePaths.P2P_OFFER_PREVIEW}
                                element={<OfferPreviewPage />}
                            />
                            <Route path={routePaths.P2P_ORDER} element={<OrderPage />} />
                            <Route
                                path={routePaths.P2P_USER_PROFILE}
                                element={<UserProfilePage />}
                            />
                            <Route
                                path={routePaths.P2P_USER_PAYMENTS}
                                element={<UserPaymentsPage />}
                            >
                                <Route index element={<PaymentsList />} />
                                <Route
                                    path={routePaths.P2P_USER_PAYMENTS_NEW}
                                    element={<AddNewPayment />}
                                />
                                <Route
                                    path={routePaths.P2P_USER_PAYMENTS_CREATE}
                                    element={<CreatePayment />}
                                />
                                <Route
                                    path={routePaths.P2P_USER_PAYMENTS_EDIT}
                                    element={<EditPayment />}
                                />
                            </Route>
                            <Route
                                path={routePaths.P2P_COUNTRY_NOT_SUPPORTED}
                                element={<CountryNotSupported />}
                            />
                        </Route>
                        <Route
                            path={routePaths.P2P_UNAVAILABLE}
                            element={<OperationsUnavailable />}
                        />
                        <Route path={routePaths.WPAY_ORDER_PAYMENT}>
                            <Route
                                index
                                element={
                                    <Suspense fallback={<WPAYOrderPaymentSkeleton />}>
                                        <WPAYOrderPayment />
                                    </Suspense>
                                }
                            />
                            <Route
                                path={routePaths.WPAY_CHOOSE_PAYMENT_ASSET}
                                element={
                                    <Suspense fallback={null}>
                                        <WPAYChoosePaymentAsset />
                                    </Suspense>
                                }
                            />
                            <Route
                                path={routePaths.WPAY_CHOOSE_DEPOSIT_TYPE}
                                element={
                                    <Suspense fallback={null}>
                                        <WPAYChooseDepositType />
                                    </Suspense>
                                }
                            />
                        </Route>
                        {/* if no match show nothing */}
                        <Route path="*" element={<NotFound />} />
                    </SentryRoutes>
                </Suspense>
            </SnackbarProvider>
        </AppearanceProvider>
    );
}

export default Sentry.withProfiler(App);
