import React from 'react';

import SessionActions from "../../../../actions/SessionActions";
import RatingStore from "./RatingStore";
import Rating from "./components/Rating";
import SearchStore from "../../SearchStore";

export default class RatingContainer extends React.Component {
    constructor(props) {
        super(props);
        this.state = RatingStore.getState();

        SessionActions.getRating(this.props.url);
        this._onChange = this._onChange.bind(this);
        this.submitHandler = this.submitHandler.bind(this);
    }

    componentWillMount() {RatingStore.addChangeListener(this._onChange);}
    componentWillUnmount() {RatingStore.removeChangeListener(this._onChange);}
    _onChange() {
        this.setState(RatingStore.getState());
    }

    submitHandler(rating) {
        if (rating === this.state.rating) rating = 0;
        SessionActions.submitRating(this.props.url, rating);
        SearchStore.modifyMetadata(this.props.url, {
            rating: this.state.total - this.state.rating + rating
        });
    }

    render() {
        return <Rating
            rating={this.state.rating}
            total={this.state.total}
            submitHandler={this.submitHandler}
        />
    }
}