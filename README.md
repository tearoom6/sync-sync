# sync-sync

sync-sync is an Atom package for managing posts of web services of documentation.

https://atom.io/packages/sync-sync

Currently, you can sync with web services below:

- [Qiita](https://qiita.com)
- [Qiita:Team](https://teams.qiita.com/)
- [esa.io](https://esa.io/)
- [DocBase](https://docbase.io/)
- [WordPress.com](https://wordpress.com/)
- [WordPress.org](https://wordpress.org/)
- [Confluence](https://www.atlassian.com/software/confluence)
- [Backlog](https://backlog.com/)


## Usage

### Sync whole list

Select a directory in the tree-view and click [Sync-Sync] > [Import/Export] in the context menu.
Then execute [Import].

### Sync each post

Select a synced file in the tree-view and click [Sync-Sync] > [Import/Export] in the context menu.
Then execute [Import].

### Create new post

Select a not-synced file in the tree-view and click [Sync-Sync] > [Import/Export] in the context menu.
Then execute [Export].

### Update post

Select a synced file in the tree-view and click [Sync-Sync] > [Import/Export] in the context menu.
Then execute [Export].

### Rename with syncing state

Select a synced file/directory in the tree-view and click [Sync-Sync] > [Rename with Syncing] in the context menu.

### Delete with syncing state

Select a synced file/directory in the tree-view and click [Sync-Sync] > [Delete with Syncing] in the context menu.

## Configuration

Open the package settings ([Sync-Sync] > [Settings]). You can change the configs below:

- [Save secrets info] : You can avoid saving access token in the config file.
- [Keep file path on importing] : You can keep already-synced file path on importing.


## Documents

API references of web services:

- [Qiita/Qiita:Team](https://qiita.com/api/v2/docs)
- [esa.io](https://docs.esa.io/posts/102)
- [DocBase](https://help.docbase.io/posts/45703)
- [WordPress.com](https://developer.wordpress.com/docs/api/)
- [WordPress.org](https://developer.wordpress.org/rest-api/)
- [Confluence (Server)](https://docs.atlassian.com/atlassian-confluence/REST/latest-server)
- [Confluence (Cloud)](https://docs.atlassian.com/atlassian-confluence/REST/latest)
- [Backlog](https://developer.nulab-inc.com/docs/backlog/)

About this package:

- [ドキュメント管理の将来設計](https://qiita.com/tearoom6/items/9518195fcd92bb87b9d0) (Japanese only)
