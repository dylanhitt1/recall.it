import App from '../App';
import DefaultPage from "../components/DefaultPage";
import UploadDataPage from "../components/UploadDataPage";
import MapDataPage from "../components/MapDataPage";
import ManageRecalls from "../components/ManageRecalls";
import ManagerUserPage from "../components/ManagerUserPage";

const childRoutes = {
    path: '/app',
    name: 'Home',
    component: DefaultPage,
    isIndex: true,
    childRoutes: [
        {
            path: '/app/manage-users',
            name: 'Manage Users',
            component: ManagerUserPage,
            requiresLogin: true
        },
        {
            path: '/app/manage-recalls',
            name: 'Manage Recalls',
            component: ManageRecalls,
            requiresLogin: true
        },
    ],
};

const routes = [{
    path: 'app',
    requiresLogin: true,
    component: App,
    childRoutes: childRoutes.childRoutes.filter(r => r.component || (r.childRoutes && r.childRoutes.length > 0)),
}];

// Handle isIndex property of route config:
//  Dupicate it and put it as the first route rule.
function handleIndexRoute(route) {
    if (!route.childRoutes || !route.childRoutes.length) {
        return;
    }

    const indexRoute = route.childRoutes.find(child => child.isIndex);
    if (indexRoute) {
        const first = {...indexRoute};
        first.path = '';
        first.exact = true;
        first.autoIndexRoute = true; // mark it so that the simple nav won't show it.
        route.childRoutes.unshift(first);
    }
    route.childRoutes.forEach(handleIndexRoute);
}

routes.forEach(handleIndexRoute);
export default routes;
