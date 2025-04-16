document.addEventListener('DOMContentLoaded', function () {
  const bookmarkTreeDiv = document.getElementById('bookmark-tree');
  const exportButton = document.getElementById('export-button');

  function toDateTime(time) {
    const dt = new Date(time);
    if (isNaN(dt.getTime())) return `[!]${time}`;
    return dt.getFullYear()
    + '-' + String(dt.getMonth() + 1).padStart(2, '0')
    + '-' + String(dt.getDate()).padStart(2, '0')
    + ' ' + String(dt.getHours()).padStart(2, '0')
    + ':' + String(dt.getMinutes()).padStart(2, '0')
    + ':' + String(dt.getSeconds()).padStart(2, '0');
  }
  
  function renderBookmarks(bookmarks, parentElement) {
    const ul = document.createElement('ul');
    parentElement.appendChild(ul);
    bookmarks.forEach(bookmark => {

      // bookmark type: {url, title, children}
      const li = document.createElement('li');
      if (bookmark.url) { // bookmark item
        let bookmark_title = bookmark.title || bookmark.url;
        li.classList.add('bookmark-item');
        const a = document.createElement('a');
        a.href = bookmark.url;
        a.innerHTML = `<div class="link-item">`
        + `<div class="link-title">${bookmark_title}</div>`
        + `<div class="link-info">`
        + `${bookmark.hasOwnProperty('read') ? `${bookmark.read ? '&#128214;' : '&#128216;'} ` : ''}`
        + `${bookmark.dateAdded ? toDateTime(bookmark.dateAdded) : ''}`
        + `</div>`
        + `</div>`;
        a.title = `${bookmark_title}\n${bookmark.url}`;
        a.target = '_blank'; // Open in a new tab
        li.appendChild(a);
      } else { // node item
        li.classList.add('node');
        const header = document.createElement('div');
        header.classList.add('node-header');
        header.textContent = bookmark.title;
        header.addEventListener('click', function () {
          this.parentNode.classList.toggle('collapsed');
        });
        li.appendChild(header);
        
        const content = document.createElement('div');
        content.classList.add('node-content');
        renderBookmarks(bookmark.children || [], content);
        li.appendChild(content);
      }
      ul.appendChild(li);
    });
  }
  
  function downloadJSON(data, filename) {
    const json = JSON.stringify(data, null, 2); // Use null, 2 for pretty printing
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
  
  async function load() {
    // interface BookmarkTreeNode {
    //   id: string
    //   parentId?: string
    //   index?: number
    //   url?: string
    //   title: string
    //   dateAdded?: number
    //   dateGroupModified?: number
    //   children?: BookmarkTreeNode[]
    // }
    // type ReadingListEntry = {
    //   id: string
    //   title: string
    //   url: string
    //   parentId?: string
    //   dateAdded?: number
    //   read: boolean
    // }
    const now = Date.now();
    const bookmarks = [];
    const reading_list_node = {
      id: "-1",
      title: "Reading List",
      dateAdded: now,
      dateGroupModified: now,
      children: [],
    };
    bookmarks.push(reading_list_node);
    const reading_list_items = await chrome.readingList.query({}); // ReadingListEntry[]
    for (const item of reading_list_items) {
      reading_list_node.children.push({
        ...item,
        dateAdded: item.dateAdded,
        id: item.id,
        index: item.index,
        parentId: item.parentId,
        syncing: item.syncing,
        title: item.title,
        url: item.url,
      });
    }
    const bookmark_tree_items = await chrome.bookmarks.getTree().then(results => results[0].children); // BookmarkTreeNode[]
    bookmarks.push(...bookmark_tree_items);
    renderBookmarks(bookmarks, bookmarkTreeDiv);
    exportButton.addEventListener('click', function () {
      downloadJSON(bookmarks, 'bookmarks.json');
    });
  }
  load().then(() => console.log('[pocket-links] loaded!'));
});