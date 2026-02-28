explain what you mean by this

Instance-level schema: what a specific configured block actually produces. That same PostgreSQL Query configured with SELECT id, name, amount FROM orders produces three specific columns with specific types. Almost nobody has this.
A Kestra PostgreSQL Query plugin declares: "I take SQL in, I produce rows out." That's the plugin schema. It's the same for every instance of that plugin.

But when you drop that plugin into a pipeline and configure it with SELECT id, name, amount FROM orders, now the actual output isn't just "rows." It's specifically three columns: id (integer), name (text), amount (numeric). That's the instance schema — it only exists once you've filled in the config.

A different instance of the same plugin configured with SELECT email, created_at FROM users produces a completely different output shape: two columns, different types. Same plugin, different config, different output contract.

So when you wire that first instance to a downstream dbt model that expects id, name, amount — does it fit? You can only answer that if you know the instance-level output. The plugin-level schema just says "rows" which tells you nothing about compatibility.

That's what I mean. The plugin says what kind of thing comes out. The instance says what specifically comes out. The second one depends on what the user typed into the config fields.

