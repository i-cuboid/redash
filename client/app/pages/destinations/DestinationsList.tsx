import { isEmpty, reject } from "lodash";
import React from "react";
import Button from "antd/lib/button";
import routeWithUserSession from "@/components/ApplicationArea/routeWithUserSession";
import navigateTo from "@/components/ApplicationArea/navigateTo";
import CardsList from "@/components/cards-list/CardsList";
import LoadingState from "@/components/items-list/components/LoadingState";
import CreateSourceDialog from "@/components/CreateSourceDialog";
import helper from "@/components/dynamic-form/dynamicFormHelper";
import wrapSettingsTab from "@/components/SettingsWrapper";
import Destination, { IMG_ROOT } from "@/services/destination";
import { policy } from "@/services/policy";
import routes from "@/services/routes";
type OwnProps = {
    isNewDestinationPage?: boolean;
    onError?: (...args: any[]) => any;
};
type State = any;
type Props = OwnProps & typeof DestinationsList.defaultProps;
class DestinationsList extends React.Component<Props, State> {
    static defaultProps = {
        isNewDestinationPage: false,
        onError: () => { },
    };
    state = {
        destinationTypes: [],
        destinations: [],
        loading: true,
    };
    componentDidMount() {
        Promise.all([Destination.query(), Destination.types()])
            .then(values => this.setState({
            destinations: values[0],
            destinationTypes: values[1],
            loading: false,
        }, () => {
            // all resources are loaded in state
            if (this.props.isNewDestinationPage) {
                if (policy.canCreateDestination()) {
                    this.showCreateSourceDialog();
                }
                else {
                    navigateTo("destinations", true);
                }
            }
        }))
            .catch(error => this.props.onError(error));
    }
    createDestination = (selectedType: any, values: any) => {
        const target = { options: {}, type: selectedType.type };
        helper.updateTargetWithValues(target, values);
        return Destination.create(target).then(destination => {
            this.setState({ loading: true });
            Destination.query().then(destinations => this.setState({ destinations, loading: false }));
            return destination;
        });
    };
    showCreateSourceDialog = () => {
        CreateSourceDialog.showModal({
            types: reject(this.state.destinationTypes, "deprecated"),
            sourceType: "Alert Destination",
            imageFolder: IMG_ROOT,
            onCreate: this.createDestination,
        })
            .onClose((result = {}) => {
            if ((result as any).success) {
                navigateTo(`destinations/${(result as any).data.id}`);
            }
        })
            .onDismiss(() => {
            navigateTo("destinations", true);
        });
    };
    renderDestinations() {
        const { destinations } = this.state;
        const items = destinations.map(destination => ({
            title: (destination as any).name,
            imgSrc: `${IMG_ROOT}/${(destination as any).type}.png`,
            href: `destinations/${(destination as any).id}`,
        }));
        return isEmpty(destinations) ? (<div className="text-center">
        There are no alert destinations yet.
        {policy.isCreateDestinationEnabled() && (<div className="m-t-5">
            <a className="clickable" onClick={this.showCreateSourceDialog}>
              Click here
            </a>{" "}
            to add one.
          </div>)}
      </div>) : (<CardsList items={items}/>);
    }
    render() {
        const newDestinationProps = {
            type: "primary",
            onClick: policy.isCreateDestinationEnabled() ? this.showCreateSourceDialog : null,
            disabled: !policy.isCreateDestinationEnabled(),
        };
        return (<div>
        <div className="m-b-15">
          {/* @ts-expect-error ts-migrate(2322) FIXME: Type '{ children: (string | Element)[]; type: stri... Remove this comment to see the full error message */}
          <Button {...newDestinationProps}>
            <i className="fa fa-plus m-r-5"/>
            New Alert Destination
          </Button>
        </div>
        {this.state.loading ? <LoadingState className=""/> : this.renderDestinations()}
      </div>);
    }
}
const DestinationsListPage = wrapSettingsTab("AlertDestinations.List", {
    permission: "admin",
    title: "Alert Destinations",
    path: "destinations",
    order: 4,
}, DestinationsList);
routes.register("AlertDestinations.List", routeWithUserSession({
    path: "/destinations",
    title: "Alert Destinations",
    render: pageProps => <DestinationsListPage {...pageProps}/>,
}));
routes.register("AlertDestinations.New", routeWithUserSession({
    path: "/destinations/new",
    title: "Alert Destinations",
    render: pageProps => <DestinationsListPage {...pageProps} isNewDestinationPage/>,
}));