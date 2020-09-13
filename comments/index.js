const express = require ('express');
const {randomBytes} = require ('crypto');
const cors = require ('cors');
const axios = require ('axios');

const app = express ();
app.use (express.json ());
app.use (cors ());

const commentsByPostId = {};

app.get ('/posts/:id/comments', (req, res) => {
  res.send (commentsByPostId[req.params.id] || []);
});

app.post ('/posts/:id/comments', async (req, res) => {
  const commentId = randomBytes (4).toString ('hex');
  const {content} = req.body;

  const comments = commentsByPostId[req.params.id] || []; // || para nao voltar undefined mas uma lista vazia

  comments.push ({id: commentId, content: content, status: 'pending'});

  commentsByPostId[req.params.id] = comments;

  await axios.post ('http://event-bus-srv:4005/events', {
    type: 'CommentCreated',
    data: {
      id: commentId,
      content,
      postId: req.params.id,
      status: 'pending',
    },
  });

  res.status (201).send (comments);
});

app.post ('/events', async (req, res) => {
  console.log ('Receive event', req.body.type);

  const {type, data} = req.body;

  if (type === 'CommentModerated') {
    const {postId, id, status, content} = data;

    const comments = commentsByPostId[postId];
    const comment = comments.find (comment => {
      return comment.id === id;
    });
    comment.status = status;

    await axios.post ('http://event-bus-srv:4005/events', {
      type: 'CommentUpdated',
      data: {
        postId,
        id,
        status,
        content,
      },
    });
  }

  res.send ({});
});

app.listen (4001, () => {
  console.log ('listening to 4001');
});
