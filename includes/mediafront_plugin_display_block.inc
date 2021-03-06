<?php
/**
 * The plugin that handles the Media Player.
 */
class mediafront_plugin_display_block extends views_plugin_display_block {
  function pre_execute() {
     parent::pre_execute();
     $this->view->get_total_rows = TRUE;
  }

  function render() {
     $preset = $this->view->field['name']->options['mediafront_preset'];  
     $params['playlistObj'] = mediafront_get_playlist_from_view( $this->view );
     $params['playlist'] = $this->view->name;
     $params['args'] = $this->view->args;
     $params['pageLimit'] = $this->view->pager['items_per_page'];
     return mediafront_get_player($preset, $params);
  }
}

