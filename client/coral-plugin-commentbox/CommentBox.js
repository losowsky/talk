import React, {PropTypes} from 'react';
import {Button} from 'coral-ui';
import {connect} from 'react-redux';
import {I18n} from '../coral-framework';
import translations from './translations.json';
import Slot from 'coral-framework/components/Slot';

const name = 'coral-plugin-commentbox';

class CommentBox extends React.Component {

  constructor(props) {
    super(props);

    this.state = {
      username: '',
      body: '',
      hooks: {
        preSubmit: [],
        postSubmit: []
      }
    };
  }

  postComment = () => {
    const {
      commentPostedHandler,
      postItem,
      setCommentCountCache,
      commentCountCache,
      isReply,
      assetId,
      parentId,
      addNotification,
    } = this.props;

    let comment = {
      asset_id: assetId,
      parent_id: parentId,
      body: this.state.body,
      ...this.props.commentBox
    };

    !isReply && setCommentCountCache(commentCountCache + 1);

    // Execute preSubmit Hooks
    this.state.hooks.preSubmit.forEach(hook => hook());

    postItem(comment, 'comments')
      .then(({data}) => {
        const postedComment = data.createComment.comment;

        // Execute postSubmit Hooks
        this.state.hooks.postSubmit.forEach(hook => hook(data));

        if (postedComment.status === 'REJECTED') {
          addNotification('error', lang.t('comment-post-banned-word'));
          !isReply && setCommentCountCache(commentCountCache);
        } else if (postedComment.status === 'PREMOD') {
          addNotification('success', lang.t('comment-post-notif-premod'));
          !isReply && setCommentCountCache(commentCountCache);
        }

        if (commentPostedHandler) {
          commentPostedHandler();
        }
      })
      .catch((err) => {
        console.error(err);
        !isReply && setCommentCountCache(commentCountCache);
      });
    this.setState({body: ''});
  }

  registerHook = (hookType = '', hook = () => {}) => {
    if (typeof hook !== 'function') {
      return console.warn(`Hooks must be functions. Please check your ${hookType} hooks`);
    } else if (typeof hookType === 'string') {
      this.setState(state => ({
        hooks: {
          ...state.hooks,
          [hookType]: [
            ...state.hooks[hookType],
            hook
          ]
        }
      }));

      return {
        hookType,
        hook
      };

    } else {
      return console.warn('hookTypes must be a string. Please check your hooks');
    }
  }

  unregisterHook = hookData => {
    const {hookType, hook} = hookData;

    this.setState(state => {
      let newHooks = state.hooks[newHooks];
      const idx = state.hooks[hookType].indexOf(hook);

      if (idx !== -1) {
        newHooks = [
          ...state.hooks[hookType].slice(0, idx),
          ...state.hooks[hookType].slice(idx + 1)
        ];
      }

      return {
        hooks: {
          ...state.hooks,
          [hookType]: newHooks
        }
      };

    });
  }

  handleChange = e => this.setState({body: e.target.value});

  render () {
    const {styles, isReply, authorId, maxCharCount} = this.props;
    let {cancelButtonClicked} = this.props;

    const length = this.state.body.length;
    const enablePostComment = !length || (maxCharCount && length > maxCharCount);

    if (isReply && typeof cancelButtonClicked !== 'function') {
      console.warn('the CommentBox component should have a cancelButtonClicked callback defined if it lives in a Reply');
      cancelButtonClicked = () => {};
    }

    return <div>
      <div
        className={`${name}-container`}>
          <label
            htmlFor={ isReply ? 'replyText' : 'commentText'}
            className="screen-reader-text"
            aria-hidden={true}>
            {isReply ? lang.t('reply') : lang.t('comment')}
          </label>
          <textarea
            className={`${name}-textarea`}
            style={styles && styles.textarea}
            value={this.state.body}
            placeholder={lang.t('comment')}
            id={isReply ? 'replyText' : 'commentText'}
            onChange={this.handleChange}
            rows={3}/>
          <Slot fill='commentInputArea' />
        </div>
        <div className={`${name}-char-count ${length > maxCharCount ? `${name}-char-max` : ''}`}>
          {maxCharCount && `${maxCharCount - length} ${lang.t('characters-remaining')}`}
        </div>
        <div className={`${name}-button-container`}>
          <Slot
            fill="commentInputDetailArea"
            registerHook={this.registerHook}
            unregisterHook={this.unregisterHook}
            inline
          />
          {
            isReply && (
              <Button
                cStyle='darkGrey'
                className={`${name}-cancel-button`}
                onClick={() => cancelButtonClicked('')}>
                {lang.t('cancel')}
              </Button>
            )
          }
          { authorId && (
              <Button
                cStyle={enablePostComment ? 'lightGrey' : 'darkGrey'}
                className={`${name}-button`}
                onClick={this.postComment}
                disabled={enablePostComment ? 'disabled' : ''}>
                {lang.t('post')}
              </Button>
            )
          }
      </div>
    </div>;
  }
}

CommentBox.propTypes = {
  charCountEnable: PropTypes.bool.isRequired,
  maxCharCount: PropTypes.number,
  commentPostedHandler: PropTypes.func,
  postItem: PropTypes.func.isRequired,
  cancelButtonClicked: PropTypes.func,
  assetId: PropTypes.string.isRequired,
  parentId: PropTypes.string,
  authorId: PropTypes.string.isRequired,
  isReply: PropTypes.bool.isRequired,
  canPost: PropTypes.bool,
};

const mapStateToProps = ({commentBox}) => ({commentBox});

export default connect(mapStateToProps, null)(CommentBox);

const lang = new I18n(translations);
