const queue = [];
export function queueJob(job) {
  if (!queue.includes(job)) {
    queue.push(job);
    queueFlush();
  }
}

let isFlushPending = false;

function queueFlush() {
  if (!isFlushPending) {
    isFlushPending = true;
    Promise.resolve().then(flushJob);
  }
}

function flushJob() {
  isFlushPending = false;

  queue.sort((a, b) => a.id - b.id);
  for (const job of queue) {
    job();
  }
  queue.length = 0;
}
